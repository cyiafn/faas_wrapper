'''
Overall flow:
1. Triggered by the SQS, invoke handler function and get UUID
2. Use the UUID to retrieve the zip file from the S3
3. Create new lambda function
4. Add new endpoint to API gateway
5. return the endpoint

'''
from botocore.exceptions import ClientError
import logging
import json
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
queue_url = 'https://sqs.ap-southeast-1.amazonaws.com/817231356792/TaskDispatcher'



def lambda_handler(event, context):
    
    
    print(event)
    uuid = event['Records'][0]['body']
    #function_runtime = message_body_json['function_runtime']
    print('uuid: ', uuid)
    function_runtime = 'python3.8'
    if uuid is None:
        write_into_to_dynamo(uuid,'status',4,True)
        return {
            'statusCode': 400,
            'body': 'uuid not retrived'
        }
    
    #access dynamodb for info
    dynamo_response = get_info_from_dynamo(uuid)
    print('dynamo_response',dynamo_response)
    statusCode = dynamo_response['status']
    print('statusCode: ', statusCode)
    if int(statusCode['N']) == 1:
        if "functionEndpoint" in dynamo_response:
            print("update")
            update_lambda(uuid)
            write_into_to_dynamo(uuid,'status',3,True)
        else:
            #create lambda function
            FunctionArn = create_new_lambda(uuid,function_runtime)
            if FunctionArn is None:
                write_into_to_dynamo(uuid,'status',4,True)
                return {
                    'statusCode': 400,
                    'body': 'lambda function not created successfully'
                }
            
            resource_id = add_rest_resource(uuid)
            if resource_id is None:
                write_into_to_dynamo(uuid,'status',4,True)
                return {
                    'statusCode': 400,
                    'body': 'add_rest_resource failed'
                }
            
            statusCode = add_integration_method(resource_id,FunctionArn)
            if statusCode != 200:
                write_into_to_dynamo(uuid,'status',4,True)
                return {
                    'statusCode': 400,
                    'body': 'add_integration_method failed'
                }
           
            message_body= deploy_api()
            print(message_body)
            endpoint_url = (f'https://function.cyifan.dev/'
                            f'{uuid}')
            uuid = event['Records'][0]['body']
            write_into_to_dynamo(uuid,'functionEndpoint',endpoint_url,False)
            response = write_into_to_dynamo(uuid,'status', 3,True)
            print("write to dynamo response: ",response)
            return {
                'statusCode': 200,
                'body': message_body
            }
    elif int(statusCode['N']) == 2:
        print("deleting")
        delete_lambda(uuid)
        response = delete_api_method_and_integration(uuid)
        if response == 400:
            return {
                'statusCode': 400,
                'body': 'Deletion unsuccessfully'
            }
        delete_dynamo_row(uuid)
        return {
                'statusCode': 200,
                'body': message_body
            } 
        
def send_message():
    print("inside send_message")
    sqs = boto3.resource('sqs')
    queue = sqs.get_queue_by_name(QueueName='TaskDispatcher')
    response = queue.send_message(
        QueueUrl=queue_url,
        MessageBody='Hello, world!'
    )
    print(f"Message sent. Message ID: {response['MessageId']}")

def get_info_from_dynamo(uuid):
    dynamodb = boto3.client('dynamodb')
    table_name = 'faas'
    key = {'uuid': {'S': uuid}}
    response = dynamodb.get_item(TableName=table_name, Key=key)
    print(response)
    item = response['Item']
    return item
def write_into_to_dynamo(uuid,key,value,is_int_value):
    dynamodb = boto3.client('dynamodb')
    table_name = 'faas'
    primary_key_value = uuid

    new_attribute_name = key
    new_attribute_value = value
    
    if is_int_value:
        response = dynamodb.update_item(
                                TableName=table_name,
                                Key={
                                        'uuid': {'S': primary_key_value}
                                    },
                                UpdateExpression='SET #status = :val',
                                ExpressionAttributeNames={
                                        '#status': 'status'  
                                    },
                                ExpressionAttributeValues={
                                        ':val': {'N': str(new_attribute_value)}  # new count value
                                    }
                            )
    else:
        response = dynamodb.update_item(
            TableName=table_name,
            Key={
                'uuid': {'S': primary_key_value}
            },
            UpdateExpression='SET #attrName = :attrValue',
            ExpressionAttributeNames={
                '#attrName': new_attribute_name
            },
            ExpressionAttributeValues={
                ':attrValue': {'S': new_attribute_value}
            }
        )
    return response

def delete_dynamo_row(primary_key_value):
    dynamodb = boto3.client('dynamodb')
    table_name = 'faas'
    
    response = dynamodb.delete_item(
        TableName=table_name,
        Key={
            'uuid': {'S': primary_key_value}
        }
    )



def delete_lambda(function_name):
    lambda_client = boto3.client('lambda')
    

    response = lambda_client.delete_function(
        FunctionName=function_name
    )
    return response
        
def update_lambda(uuid):
    client = boto3.client('lambda')

    function_name = uuid
    s3_bucket = 'faas-wrapper-code'
    s3_key = uuid + '.zip'
    
    response = client.update_function_code(
        FunctionName=function_name,
        S3Bucket=s3_bucket,
        S3Key=s3_key
    )

      
def create_new_lambda(uuid,function_runtime):
    client = boto3.client('lambda')
    
    s3_bucket = 'faas-wrapper-code'
    s3_key = uuid + '.zip'
    
    #function_name = 'my-new-function'
    #name of python file: index
    #name of handler function inside the python file lambda_handler(event, context)
    function_handler = 'index.lambda_handler'
    #function_runtime = 'python3.8'
    role_arn = 'arn:aws:iam::817231356792:role/User_Created_Lambda_Role'

    response = client.create_function(
        FunctionName=uuid,
        Runtime=function_runtime,
        Role=role_arn,
        Handler=function_handler,
        Code={
        'S3Bucket': s3_bucket,
        'S3Key': s3_key,
    }
    )
    
    return response['FunctionArn']

def delete_api_method_and_integration(method_name):
    api_gateway = boto3.client('apigateway')

    rest_api_id = 'we71vnmn60'
    resource_id = None
    response = api_gateway.get_resources(
        restApiId=rest_api_id,
    )
    for resource in response['items'] :
        if 'pathPart' in resource and method_name in resource['pathPart']:
            resource_id = resource['id']
            print('resource id: ', resource_id)
            break
    
    if resource_id is None:
        return 400
    
    http_method = 'POST'
    
    response = api_gateway.get_method(
        restApiId=rest_api_id,
        resourceId=resource_id,
        httpMethod=http_method
    )
    
    api_gateway.delete_integration(
        restApiId=rest_api_id,
        resourceId=resource_id,
        httpMethod=http_method
    )
    
    api_gateway.delete_method(
        restApiId=rest_api_id,
        resourceId=resource_id,
        httpMethod=http_method
    )
    api_gateway.delete_resource(
    restApiId=rest_api_id,
    resourceId=resource_id
    )


def add_rest_resource(resource_path):
    client = boto3.client('apigateway')
    api_id = 'we71vnmn60'
    parent_id = 'l1e9q3l49j'
    #resource_path = 'usermethod'
    """
    Adds a resource to a REST API.

    :param parent_id: The ID of the parent resource.
    :param resource_path: The path of the new resource, relative to the parent.
    :return: The ID of the new resource.
    """
    try:
        result = client.create_resource(
            restApiId=api_id, parentId=parent_id, pathPart=resource_path)
        resource_id = result['id']
        logger.info("Created resource %s.", resource_path)
    except ClientError:
        logger.exception("Couldn't create resource %s.", resource_path)
        raise
    else:
        return resource_id 
    
def add_integration_method(resource_id,FunctionArn):
        api_id = 'we71vnmn60'
        #resource_id = 'mmac1s'
        rest_method = 'POST'
        service_endpoint_prefix = 'lambda'
        service_action = 'get'
        service_method = 'POST'
        role_arn = 'arn:aws:iam::817231356792:role/AWSLambdaSQSQueueExecuionRole'
        mapping_template = '{}'
        #mapping_template = '{"input" : "$input.params('input')"}'
        """
        Adds an integration method to a REST API. An integration method is a REST
        resource, such as '/users', and an HTTP verb, such as GET. The integration
        method is backed by an AWS service, such as Amazon DynamoDB.

        :param resource_id: The ID of the REST resource.
        :param rest_method: The HTTP verb used with the REST resource.
        :param service_endpoint_prefix: The service endpoint that is integrated with
                                        this method, such as 'dynamodb'.
        :param service_action: The action that is called on the service, such as
                               'GetItem'.
        :param service_method: The HTTP method of the service request, such as POST.
        :param role_arn: The Amazon Resource Name (ARN) of a role that grants API
                         Gateway permission to use the specified action with the
                         service.
        :param mapping_template: A mapping template that is used to translate REST
                                 elements, such as query parameters, to the request
                                 body format required by the service.
        """
        client = boto3.client('apigateway')
        service_uri = (f'arn:aws:apigateway:ap-southeast-1'
                       f':lambda:action/{service_action}')
        service_uri = (f'arn:aws:apigateway:ap-southeast-1:lambda:path/2015-03-31/functions/'
                       f'{FunctionArn}/invocations')
        try:
            client.put_method(
                restApiId=api_id,
                resourceId=resource_id,
                httpMethod=rest_method,
                authorizationType='NONE')
            client.put_method_response(
                restApiId=api_id,
                resourceId=resource_id,
                httpMethod=rest_method,
                statusCode='200',
                responseModels={'application/json': 'Empty'})
            logger.info("Created %s method for resource %s.", rest_method, resource_id)
        except ClientError:
            print(
                "Couldn't create %s method for resource %s.", rest_method, resource_id)
            raise

        try:
            client.put_integration(
                restApiId=api_id,
                resourceId=resource_id,
                httpMethod=rest_method,
                type='AWS',
                integrationHttpMethod='POST',
                credentials=role_arn,
                requestTemplates={'application/json': json.dumps(mapping_template)},
                uri = service_uri,
                passthroughBehavior='WHEN_NO_TEMPLATES')
            client.put_integration_response(
                restApiId=api_id,
                resourceId=resource_id,
                httpMethod=rest_method,
                statusCode='200',
                responseTemplates={'application/json': ''})
            logger.info(
                "Created integration for resource %s to service URI %s.", resource_id,
                service_uri)
        except ClientError:
            print(
                "Couldn't create integration for resource %s to service URI %s.",
                resource_id, service_uri)
            raise    
        return 200
def deploy_api():
        client = boto3.client('apigateway')
        api_id = 'we71vnmn60'
        stage_name = 'default'
        """
        Deploys a REST API. After a REST API is deployed, it can be called from any
        REST client, such as the Python Requests package or Postman.

        :param stage_name: The stage of the API to deploy, such as 'test'.
        :return: The base URL of the deployed REST API.
        """
        try:
            response = client.create_deployment(
                restApiId=api_id, stageName=stage_name)
            print("Deployed stage %s.", stage_name)
        except ClientError:
            print("Couldn't deploy stage %s.", stage_name)
            raise
        return response
    
def add_route_to_api_gateway():
    
    
    '''
    
    
    #HTTP API gateway
    
    client = boto3.client('apigatewayv2')
    #create api gateway integration first
    lambda_integration = {
        'IntegrationType': 'AWS_PROXY',
        'IntegrationUri': 'arn:aws:lambda:ap-southeast-1:817231356792:function:my-new-function',
    }
    
    # Create the integration
    response = client.create_integration(
        ApiId='00fl45y5n2',
        IntegrationType='AWS_PROXY',
        IntegrationMethod = 'GET',
        IntegrationUri='arn:aws:lambda:ap-southeast-1:817231356792:function:my-new-function',
        PayloadFormatVersion = '2.0'
    )
    IntegrationId = response['IntegrationId']
    target = 'integrations/' + IntegrationId
    # Print the response
    print(response)
    
    
    
    response = client.create_route(ApiId = '00fl45y5n2',RouteKey='GET /deploy',Target=target)
    response = client.create_deployment(
    ApiId='00fl45y5n2',
    Description='trial deployment',
    StageName='$default'
    )
    print(response)
    
    '''
    
