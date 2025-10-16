import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import ThreeScene from './components/ThreeScene';
import FileUpload from './components/FileUpload';
import Model3dIcon from './components/icons/Model3dIcon';
import SparklesIcon from './components/icons/SparklesIcon';
import Spinner from './components/Spinner';

// Definisikan tipe untuk peta PBR untuk kejelasan
export interface PBRMaps {
  albedo: string; // Peta Warna/Diffuse
  normal: string; // Peta Normal untuk detail
  roughness: string; // Peta Kekasaran
  ao: string; // Peta Ambient Occlusion
}

const App: React.FC = () => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<number>(0);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [generatedPbrMaps, setGeneratedPbrMaps] = useState<PBRMaps | null>(null);

  // Ref untuk memanggil fungsi pembuatan AO di ThreeScene
  const threeSceneRef = useRef<{ generateAoMap: () => Promise<string | null> }>(null);

  const handleFileChange = useCallback((file: File | null) => {
    if (file) {
      if (file.name.toLowerCase().endsWith('.fbx')) {
        const url = URL.createObjectURL(file);
        setFileUrl(url);
        setFileName(file.name);
        setError(null);
        setGeneratedPbrMaps(null);
        setPrompt('');
        setIsModelLoaded(false);
        setKey(prevKey => prevKey + 1);
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
    setGeneratedPbrMaps(null);
    setIsModelLoaded(false);
    setKey(prevKey => prevKey + 1);
  };

  const handleGenerateTexture = async () => {
    if (!prompt.trim()) {
      setError("Please enter a description for the texture.");
      return;
    }
    if (!threeSceneRef.current) {
      setError("3D scene is not ready.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    setGeneratedPbrMaps(null);

    try {
      // Langkah 1: Hasilkan Peta Ambient Occlusion (AO) dari model 3D
      setGenerationStatus('Analyzing 3D model geometry...');
      const aoMapBase64 = await threeSceneRef.current.generateAoMap();
      if (!aoMapBase64) {
        throw new Error("Could not generate the geometry-aware map (AO Map) from the 3D model.");
      }
      
      const aoImagePart = {
        inlineData: {
          mimeType: 'image/png',
          data: aoMapBase64.split(',')[1],
        },
      };

      // Langkah 2: Panggil Gemini dengan prompt Teks + gambar Peta AO
      setGenerationStatus('Generating PBR textures...');
      if (!process.env.API_KEY) {
        throw new Error("API key is not configured.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const fullPrompt = `Based on the user's prompt "${prompt}", generate a full set of seamless PBR textures. You MUST use the provided ambient occlusion map as a guide for shape, shadow, and detail placement. For example, add dirt in the crevices (dark areas) and wear on the exposed surfaces (light areas). Return a JSON object containing base64 encoded PNG strings for 'albedo', 'normal', 'roughness', and 'ao' maps.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: fullPrompt }, aoImagePart],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              albedo: { type: Type.STRING, description: 'Base64 encoded PNG for the color map.' },
              normal: { type: Type.STRING, description: 'Base64 encoded PNG for the normal map.' },
              roughness: { type: Type.STRING, description: 'Base64 encoded PNG for the roughness map.' },
              ao: { type: Type.STRING, description: 'Base64 encoded PNG for the new, enhanced ambient occlusion map.' },
            },
            required: ["albedo", "normal", "roughness", "ao"],
          },
        },
      });
      
      setGenerationStatus('Applying textures...');
      const jsonResponse = JSON.parse(response.text);

      if (jsonResponse.albedo && jsonResponse.normal && jsonResponse.roughness && jsonResponse.ao) {
        setGeneratedPbrMaps({
          albedo: `data:image/png;base64,${jsonResponse.albedo}`,
          normal: `data:image/png;base64,${jsonResponse.normal}`,
          roughness: `data:image/png;base64,${jsonResponse.roughness}`,
          ao: `data:image/png;base64,${jsonResponse.ao}`,
        });
      } else {
        throw new Error("The AI response was missing one or more required PBR maps.");
      }

    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Texture generation failed: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 antialiased">
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-cyan-400 tracking-tight">FBX 3D Mesh Viewer</h1>
          <p className="text-gray-400 mt-2">Upload your .fbx file, then generate custom, geometry-aware PBR textures with AI.</p>
        </header>

        <main className="bg-gray-800 rounded-xl shadow-2xl shadow-cyan-500/10 border border-gray-700 w-full">
          {fileUrl ? (
            <div className="flex flex-col">
              <div className="relative w-full h-[50vh] lg:h-[60vh]">
                <ThreeScene 
                  ref={threeSceneRef}
                  key={key} 
                  fileUrl={fileUrl} 
                  pbrMaps={generatedPbrMaps} 
                  onError={setError}
                  onLoad={() => setIsModelLoaded(true)}
                />
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
              <div className="p-4 border-t border-gray-700 bg-gray-800/50 rounded-b-xl">
                <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5"/>
                  AI PBR Texture Generator
                </h3>
                {!isModelLoaded && fileUrl && (
                  <p className="text-sm text-gray-400 italic px-1 pb-2">Waiting for model to finish loading...</p>
                )}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., 'worn leather sofa with fabric cushions'"
                    className="flex-grow w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-wait"
                    disabled={isGenerating || !isModelLoaded}
                  />
                  <button
                    onClick={handleGenerateTexture}
                    disabled={isGenerating || !prompt.trim() || !isModelLoaded}
                    className="flex items-center justify-center px-4 py-2 font-bold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed w-full sm:w-48"
                  >
                    {isGenerating ? (
                      <>
                        <Spinner className="h-5 w-5" />
                        <span className="ml-2 truncate">{generationStatus || 'Generating...'}</span>
                      </>
                    ) : (
                      'Generate Texture'
                    )}
                  </button>
                </div>
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
            <div className="w-full max-w-5xl p-4 bg-red-800/50 border border-red-700 text-red-300 rounded-lg text-center">
                <strong>Error:</strong> {error}
            </div>
        )}
      </div>
      <footer className="text-center mt-8 text-gray-500 text-sm">
        <p>Powered by React, Three.js & Gemini</p>
      </footer>
    </div>
  );
};

export default App;
