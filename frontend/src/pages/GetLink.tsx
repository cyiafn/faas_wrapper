import React, { useState } from 'react';
import axios from "axios";

function GetLink() {
  const [uuid, setUuid] = useState('');
  const [status, setStatus] = useState<{ endpoint: string, status: number }>({ endpoint: '', status: -1 });

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
      }else if(status==1)
      {
        alert('Your code is still deploying.');
      }
      setStatus({ endpoint, status });
    } catch(error){
      alert('UUID does not exist!!!')
    }
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-start h-100">
      <h1 className="my-4 text-center">Check your endpoint here</h1>
      <div className="mb-3">
        <label htmlFor="uuid-input" className="form-label">
          Please enter your UUID:
        </label>
        <input type="text" className="form-control" id="uuid-input" value={uuid} onChange={handleUuidChange} />
      </div>
      <button className="btn btn-primary" onClick={handleGetStatus} disabled={!uuid}>
        Get Link
      </button>
      {(status.status !== -1 && (status.status == 3||status.status==4)) && (
        <div>
          <p>    </p>
          <p>Endpoint: {status.endpoint}</p>
        </div>
      )}
    </div>
  );
}

export default GetLink;
