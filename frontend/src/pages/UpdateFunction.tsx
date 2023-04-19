import React, { useState, useEffect } from 'react';
import axios from "axios";
import {ulocation} from '../components/Layout'

function UpdateFunction() {
  const [uuid, setUuid] = useState('');
  const [status, setStatus] = useState<{ endpoint: string, status: number }>({ endpoint: '', status: -1 });
  const [file, setFile] = useState<File | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [infoLink, setInfoLink] = useState('');
  const [isLoading, setIsLoading] = useState(false); // new loading state variable

  const handleUuidChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUuid(event.target.value);
  };

  const handleGetStatus = async () => {
    try{
      const res = await axios.post("https://faas-be.cyifan.dev/faas/getStatus", {"uuid" : uuid });
      console.log(res)
      const endpoint = res.data['functionEndpoint'];
      const status = res.data.status;
      console.log(res.data.status)
      if(status != 1 && status != 3 && status != 4){
        alert('UUID does not exist!!!');
      }
      setStatus({ endpoint, status });
    } catch(error){
      alert('UUID does not exist!!!')
    }
  };


  const handleUpload = () => {
    if (!file) {
      alert('Please select a file to upload.');
      return;
    }

    setUploadStatus('Deploying...');

    const formData = new FormData();
    formData.append('file', file, uuid+".zip");

    fetch(`https://faas-be.cyifan.dev/faas/uploadCode`, {
      method: 'POST',
      body: formData,
    })
      .then(async (res) => {
        setStatusCode(res.status);
        console.log(res.status);
        if (res.status === 200) {
          setUploadStatus('Great! Your file has been Transferred.\nDeploying ...');
          var st = -2;
          var count1 = 0;
          while(st!==3 && st!==4 && count1<60&&ulocation=='/update'){
            await handleGetStatus()
            st = status.status
            setInfoLink(status.endpoint)
            console.log(status.status)
            count1 = count1+1
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          if (count1>=60){
            setUploadStatus('Deploy timeout.')
          }else{
            setUploadStatus('The deploying is finished.')
          }
        } else {
          setUploadStatus('The deploying has failed.');
        }
      })
      .catch((err) => {
        console.error(err);
        setUploadStatus('The deploying has failed.');
      });
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-start h-100">
      <h1 className="my-4 text-center">Update your function here</h1>
      <div className="mb-3">
        <label htmlFor="uuid-input" className="form-label">
          Please enter your UUID:
        </label>
        <input type="text" className="form-control" id="uuid-input" value={uuid} onChange={handleUuidChange} />
      </div>
      <button className="btn btn-primary" onClick={handleGetStatus} disabled={!uuid}>
        Get Info
      </button>
      {(status.status == 3 || status.status == 4 || status.status == 1) && (
        <div className="mt-4">
          <h4>Upload Code:</h4>
          <p>Your file needs to be a zip file that contains your code and all dependencies.</p>
          <p>Entry point for your founction must have a filename of index.py and function definition of lamda_hander(event,context)</p>
          <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
          <button className="btn btn-primary mt-2" onClick={handleUpload} disabled={!file}>
            Upload
          </button>
          {uploadStatus && 
            (
              <div className="mt-4">
                <h5>Your uploading status:</h5>
                <p>{uploadStatus}</p>
              </div>
            )
          }
          {uploadStatus === 'The deploying is finished.' && (
            <div className="mt-4">
              <h5>Function URL:</h5>
              <p>{infoLink}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}  

export default UpdateFunction