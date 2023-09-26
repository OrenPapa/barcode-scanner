import React, { useState, useEffect, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import styled from "styled-components";
const { scanImageData } = require("zbar.wasm");

const SelectContainer = styled.div`
  margin-bottom: 20px;
`;

const Select = styled.select``;

const Button = styled.button``;

const ControlsContainer = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1;
`;

const CameraContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;

  video {
    transform: ${(props) => (props.$isMirrored ? "scaleX(-1)" : "none")};
  }
`;

const App = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMirrored, setIsMirrored] = useState(false);
  const [barcodes, setBarcodes] = useState([]);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const SCAN_PERIOD_MS = 100;
  const scan = useCallback(async () => {
    const video = webcamRef.current && webcamRef.current.video;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const results = await scanImageData(imgData);
    if (results.length > 0) {
      const decodedBarcodes = results.map((symbol) => symbol.decode());
      setBarcodes((prevBarcodes) => {
        const newBarcodes = [];
        decodedBarcodes.forEach((barcode) => {
          console.log(barcode)
          // Check if barcode is not already in the state
          if (!prevBarcodes.includes(barcode)) {
            newBarcodes.push(barcode);
          }
        });
        // Return the new barcodes state, concatenating previous barcodes with new ones
        return [...prevBarcodes, ...newBarcodes];
      });
    }

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    for (const sym of results) {
      const points = sym.points;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "green";
      ctx.stroke();

      ctx.font = "20px Arial";
      ctx.fillStyle = "red";
      ctx.fillText(sym.decode(), points[0].x, points[0].y);
    }
  }, []);

  useEffect(() => {
    const scanInterval = setInterval(scan, SCAN_PERIOD_MS);
    return () => clearInterval(scanInterval);
  }, [scan]);

  useEffect(() => {
    async function fetchDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
          if (videoDevices.length === 1) {
            setShowCamera(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch devices:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDevices();
  }, []);

  const handleScan = () => {};

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {showCamera ? (
        <>
          <CameraContainer $isMirrored={isMirrored}>
            {/* Positioning the controls within the CameraContainer */}
            <ControlsContainer>
              {/* Toggle Mirror Button */}
              <Button onClick={() => setIsMirrored(!isMirrored)}>
                Toggle Mirror
              </Button>
              {/* Displaying Select Container here */}
              {devices.length > 1 && (
                <SelectContainer>
                  <Select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                  >
                    {devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId}`}
                      </option>
                    ))}
                  </Select>
                </SelectContainer>
              )}
            </ControlsContainer>
            {/* Webcam Component */}
            <Webcam
              ref={webcamRef}
              videoConstraints={{ deviceId: selectedDeviceId }}
              // width="100%"
              // height="100%"
              onUserMedia={handleScan}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                height: "100vh",
                // top: 0,
                // left: 0,
              }}
            />
          </CameraContainer>
        </>
      ) : (
        <div>
          {/* Open Camera Button */}
          <Button onClick={() => setShowCamera(true)}>Open Camera</Button>
        </div>
      )}
      {/* Display detected barcodes */}
      <div>
        Detected Barcodes:
        {barcodes?.map((barcode, index) => (
          <div key={index}>{barcode}</div>
        ))}
      </div>
    </div>
  );
};

export default App;
