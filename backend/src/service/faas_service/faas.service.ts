import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { NewRequestDTO, NewResponseDTO } from './dto/new';
import { FaasDAO, FaasStatus, getFaasTableName } from './dao/faas';
import { v4 as uuidv4 } from 'uuid';
import { DB, wrapDAO } from '../../providers/dynamodb/client';
import { getBucketName, s3 } from '../../providers/s3/client';
import { ManagedUpload } from 'aws-sdk/clients/s3';
import { sqsClient } from '../../providers/sqs/client';
import { GetStatusRequestDTO, GetStatusResponseDTO } from './dto/getStatus';
import { DeleteRequestDTO } from './dto/delete';

@Injectable()
export class FaasService {
  getDetails(request: Request) {
    return JSON.stringify(request.body);
  }

  new(request: NewRequestDTO): string {
    const uuidOfRequest = uuidv4();

    const newRequest = new FaasDAO(
      uuidOfRequest,
      FaasStatus.WAITING_FOR_UPLOAD,
      request.Runtime,
    );

    DB.put(wrapDAO(newRequest, getFaasTableName()), (err) => {
      if (err) {
        console.log(err);
        throw new HttpException(
          `unable to create new faas`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    });

    return JSON.stringify(new NewResponseDTO(uuidOfRequest));
  }

  async uploadCode(file) {
    const uuid = file.originalname.replace('.zip', '');
    const readParams = {
      ExpressionAttributeValues: {
        ':s': uuid,
      },
      KeyConditionExpression: `#pk = :s`,
      ExpressionAttributeNames: {
        '#pk': 'uuid',
      },
      TableName: getFaasTableName(),
    };

    const readOutput = await DB.query(readParams).promise();
    if (readOutput.$response.error) {
      console.log(readOutput.$response.error);
      throw new BadRequestException(readOutput.$response.error.message, {
        cause: readOutput.$response.error,
      });
    }

    if (readOutput.Count === 0) {
      throw new BadRequestException(`faas uuid provided not found`);
    }

    let uploadOutput: ManagedUpload.SendData;
    try {
      uploadOutput = await s3
        .upload({
          Bucket: getBucketName(),
          Body: file.buffer,
          Key: file.originalname,
        })
        .promise();
    } catch (err) {
      throw new InternalServerErrorException(err);
    }

    const updateParams = {
      Key: {
        uuid: uuid,
      },
      UpdateExpression: `set #p = :p, #s = :s`,
      ExpressionAttributeValues: {
        ':p': uploadOutput.Key,
        ':s': FaasStatus.DEPLOYING,
      },
      ExpressionAttributeNames: {
        '#p': 's3Path',
        '#s': 'status',
      },
      TableName: getFaasTableName(),
    };

    const updateOutput = await DB.update(updateParams).promise();
    if (updateOutput.$response.error) {
      console.log(updateOutput.$response.error);
      throw new BadRequestException(updateOutput.$response.error.message, {
        cause: updateOutput.$response.error,
      });
    }

    const sqsMsg = {
      DelaySeconds: 0,
      MessageBody: uuid,
      QueueUrl: `https://sqs.ap-southeast-1.amazonaws.com/817231356792/TaskDispatcher`,
    };

    sqsClient.sendMessage(sqsMsg, (err, data) => {
      if (err) {
        console.log(err);
        throw new InternalServerErrorException(err);
      } else {
        console.log(data.MessageId);
      }
    });
  }

  async getStatus(request: GetStatusRequestDTO): Promise<string> {
    const readParams = {
      Key: {
        uuid: request.uuid,
      },
      TableName: getFaasTableName(),
    };

    const output = await DB.get(readParams).promise();

    if (output.$response.error) {
      console.log(output.$response.error);
      throw new NotFoundException(output.$response.error);
    }
    return JSON.stringify(new GetStatusResponseDTO(output.Item));
  }

  async delete(request: DeleteRequestDTO) {
    const readParams = {
      Key: {
        uuid: request.uuid,
      },
      TableName: getFaasTableName(),
    };

    const itemOutput = await DB.get(readParams).promise();

    if (itemOutput.$response.error) {
      console.log(itemOutput.$response.error);
      throw new NotFoundException(itemOutput.$response.error);
    }

    if (
      itemOutput.Item[`status`] !== FaasStatus.SUCCESS &&
      itemOutput.Item[`status`] !== FaasStatus.FAILURE
    ) {
      throw new BadRequestException('status is not success or failure');
    }

    const deleteObjOutput = await s3
      .deleteObject({
        Bucket: getBucketName(),
        Key: itemOutput.Item[`s3Path`] + '.zip',
      })
      .promise();

    if (deleteObjOutput.$response.error) {
      console.log(deleteObjOutput.$response.error);
      throw new InternalServerErrorException(deleteObjOutput.$response.error, {
        cause: deleteObjOutput.$response.error,
      });
    }

    const updateParams = {
      Key: {
        uuid: request.uuid,
      },
      UpdateExpression: `set #s = :s`,
      ExpressionAttributeValues: {
        ':s': FaasStatus.DELETING,
      },
      ExpressionAttributeNames: {
        '#s': 'status',
      },
      TableName: getFaasTableName(),
    };

    const updateOutput = await DB.update(updateParams).promise();
    if (updateOutput.$response.error) {
      console.log(updateOutput.$response.error);
      throw new InternalServerErrorException(
        updateOutput.$response.error.message,
        {
          cause: updateOutput.$response.error,
        },
      );
    }

    const sqsMsg = {
      DelaySeconds: 0,
      MessageBody: request.uuid,
      QueueUrl: `https://sqs.ap-southeast-1.amazonaws.com/817231356792/TaskDispatcher`,
    };

    sqsClient.sendMessage(sqsMsg, (err, data) => {
      if (err) {
        console.log(err);
        throw new InternalServerErrorException(err);
      } else {
        console.log(data.MessageId);
      }
    });
  }
}
