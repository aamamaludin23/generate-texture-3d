
import React, { useState, useCallback } from 'react';
import ThreeScene from './components/ThreeScene';
import FileUpload from './components/FileUpload';
import Model3dIcon from './components/icons/Model3dIcon';

const App: React.FC = () => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<number>(0);

  const handleFileChange = useCallback((file: File | null) => {
    if (file) {
      if (file.name.toLowerCase().endsWith('.fbx')) {
        const url = URL.createObjectURL(file);
        setFileUrl(url);
        setFileName(file.name);
        setError(null);
        setKey(prevKey => prevKey + 1); // Remount ThreeScene
      } else {
        setError('Invalid file type. Please upload a .fbx file.');
        setFileUrl(null);
        setFileName(null);
      }
    }
  }, []);

  const handleReset = () => {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    setFileUrl(null);
    setFileName(null);
    setError(null);
    setKey(prevKey => prevKey + 1);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 antialiased">
      <div className="w-full max-w-5xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl font-bold text-cyan-400 tracking-tight">FBX 3D Mesh Viewer</h1>
          <p className="text-gray-400 mt-2">Upload your .fbx file to view and interact with the 3D model.</p>
        </header>

        <main className="bg-gray-800 rounded-xl shadow-2xl shadow-cyan-500/10 border border-gray-700 w-full">
          {fileUrl ? (
            <div className="relative w-full h-[60vh] lg:h-[70vh]">
              <ThreeScene key={key} fileUrl={fileUrl} onError={setError} />
               <div className="absolute top-4 right-4 flex items-center space-x-4">
                 <p className="bg-gray-900/50 text-white text-sm px-3 py-1.5 rounded-md backdrop-blur-sm truncate max-w-xs">{fileName}</p>
                 <button 
                  onClick={handleReset} 
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                 >
                   Load Another
                 </button>
               </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 h-[60vh] lg:h-[70vh]">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <Model3dIcon className="w-24 h-24 text-gray-600"/>
                    </div>
                    <h2 className="text-2xl font-semibold mb-4 text-white">No model loaded</h2>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">
                        Drag & drop your FBX file here or click the button below to select a file from your device.
                    </p>
                    <FileUpload onFileSelect={handleFileChange} />
                </div>
            </div>
          )}
        </main>
        
        {error && (
            <div className="mt-4 w-full max-w-5xl p-4 bg-red-800/50 border border-red-700 text-red-300 rounded-lg text-center">
                <strong>Error:</strong> {error}
            </div>
        )}
      </div>
      <footer className="text-center mt-8 text-gray-500 text-sm">
        <p>Powered by React & Three.js</p>
      </footer>
    </div>
  );
};

export default App;
