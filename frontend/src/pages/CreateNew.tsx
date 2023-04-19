import React, { useState, useEffect } from 'react';
import axios from "axios";
import {ulocation} from '../components/Layout'

function CreateNew() {
  const [uuid, setUuid] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [infoLink, setInfoLink] = useState('');


  const handleLanguageSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(event.target.value);
  };

  const handleCreateNew = () => {
    if (selectedLanguage !== 'Python 3.8') {
      alert('The language you chose is currently not supported by us.');
      return;
    }

    setUploadStatus("");
    setFile(null)


    // Uploading the file using the fetch API to the server
    fetch('https://faas-be.cyifan.dev/faas/new', {
      method: 'POST',
      body: '',
    })
      .then((res) => res.json())
      .then((data) => data['uuid'])
      .then((data) => {
        setUuid(data);
        alert(
          'The UUID below is the only certificate to access your work.\nPlease save this UUID somewhere else!\nPlease save this UUID somewhere else!\nPlease save this UUID somewhere else!\nUUID: ' +
            data
        );
      })
      .catch((err) => console.error(err));
  };

  const handleUpload = () => {
    if (!file) {
      alert('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    if(!file.name.endsWith('.zip')){
      alert('Please select a zip file to upload.');
      return;
    }
    setUploadStatus('Uploading ...');
    formData.append('file', file, uuid+".zip");

    fetch(`https://faas-be.cyifan.dev/faas/uploadCode`, {
      method: 'POST',
      body: formData,
    })
      .then(async (res) => {
        setStatusCode(res.status);
        console.log(res.status);
        if (res.status === 200) {
          setUploadStatus('Great! Your file has been uploaded.\nDeploying ...');
          var st = -2;
          var count = 0
          while(st!=3&&st!=4&&count<60&&ulocation=='/create'){
            const response = await handleGetStatus()
            st = response.status
            setInfoLink(response.endpoint)
            console.log(response.status)
            await new Promise(resolve => setTimeout(resolve, 5000));
            count = count + 1
          }
          if (count>=60){
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


  const handleGetStatus = async (): Promise<{ endpoint: string, status: number }> => {
    const object = {"uuid":uuid};
    try {
      const response = await axios.post("https://faas-be.cyifan.dev/faas/getStatus", object);
      console.log(response.data['functionEndpoint']);
      console.log('here')
      const endpoint = response.data['functionEndpoint']
      const status = response.data['status']
      return { endpoint, status };
    } catch (error) {
      console.error(error);
      return { endpoint: '', status: -1 };
    }
  };
  
  const languageOptions = ['Python 3.8'];

  return (
    <div className="d-flex flex-column align-items-center justify-content-start h-100">
      <h1 className="my-4 text-center">Create a new function here</h1>
      <div className="mb-3">
        <label htmlFor="language-select" className="form-label">
          Select Programming Language:
        </label>
        <select
          className="form-select"
          id="language-select"
          value={selectedLanguage}
          onChange={handleLanguageSelect}
        >
          <option value="">-- Select Language --</option>
          {languageOptions.map((language, index) => (
            <option key={index} value={language}>
              {language}
            </option>
          ))}
        </select>
      </div>
      <button className="btn btn-primary" onClick={handleCreateNew} disabled={!selectedLanguage}>
        Create New
      </button>
      {uuid && (
        <div className="mt-4">
          <h4>Your UUID:</h4>
          <p>{uuid}</p>
        </div>
      )}
      {uuid && (
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
          {uploadStatus == 'The deploying is finished.' && (
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
export default CreateNew;