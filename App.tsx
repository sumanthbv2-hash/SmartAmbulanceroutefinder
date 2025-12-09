import React, { useState, useEffect } from 'react';
import { AppView, MissionStatus, TrafficLightState, Coordinate, EmergencyDetails, AILog } from './types';
import MapComponent from './components/MapComponent';
import MapHUD from './components/MapHUD';
import AILogPanel from './components/AILogPanel';
import FuturisticButton from './components/FuturisticButton';
import { analyzeEmergency } from './services/gemini';

// Default Coordinates (Example: Central Park, NY)
const BASE_LAT = 40.785091;
const BASE_LNG = -73.968285;
const HOSPITAL_LOC: Coordinate = { lat: 40.789125, lng: -73.954605 }; // Mount Sinai

const App: React.FC = () => {
  // State
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [status, setStatus] = useState<MissionStatus>(MissionStatus.IDLE);
  const [ambulancePos, setAmbulancePos] = useState<Coordinate>({ lat: BASE_LAT, lng: BASE_LNG });
  const [targetPos, setTargetPos] = useState<Coordinate | null>(null);
  const [emergency, setEmergency] = useState<EmergencyDetails>({
    type: 'Cardiac Arrest',
    severity: 'Critical',
    patientName: 'John Doe',
    description: 'Male, 55, chest pains, collapsed.'
  });
  const [logs, setLogs] = useState<AILog[]>([]);
  
  // HUD Data
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState("0.0 km");
  const [eta, setEta] = useState("--:--");
  const [trafficState, setTrafficState] = useState<TrafficLightState>(TrafficLightState.RED);
  const [showTransModal, setShowTransModal] = useState(false);
  
  // Inputs
  const [manualLat, setManualLat] = useState(BASE_LAT.toString());
  const [manualLng, setManualLng] = useState(BASE_LNG.toString());

  // Helper: Add Log
  const addLog = (message: string, type: AILog['type'] = 'info') => {
    const newLog: AILog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Login Handler
  const handleLogin = () => {
    addLog("System initialized. User authenticated.", 'success');
    setView(AppView.DASHBOARD);
  };

  // Dashboard: Manual Location
  const handleManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      setAmbulancePos({ lat, lng });
      addLog(`Manual coordinates set: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'warning');
    } else {
      addLog("Invalid coordinates entered.", 'warning');
    }
  };

  // Dashboard: Auto Detect Location
  const handleAutoLocation = () => {
    addLog("Initiating satellite triangulation...", 'info');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setAmbulancePos(newPos);
          setManualLat(newPos.lat.toString());
          setManualLng(newPos.lng.toString());
          addLog(`Location locked: ${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)}`, 'success');
        },
        (error) => {
          addLog("GPS Signal weak. Defaulting to Base Station.", 'warning');
        }
      );
    } else {
      addLog("Geolocation module offline.", 'warning');
    }
  };

  // Dashboard: Start Mission
  const startMission = async () => {
    setView(AppView.MAP_NAVIGATION);
    setStatus(MissionStatus.CALCULATING);
    addLog("Mission parameters uploaded. Analyzing route...", 'info');
    
    // Simulate Random Patient Location ~1.5km away
    const randomLat = ambulancePos.lat + (Math.random() - 0.5) * 0.02;
    const randomLng = ambulancePos.lng + (Math.random() - 0.5) * 0.02;
    setTargetPos({ lat: randomLat, lng: randomLng });

    // Call AI
    const aiAnalysis = await analyzeEmergency(emergency.type, emergency.severity, "Heavy Congestion");
    addLog(aiAnalysis, 'analysis');

    setStatus(MissionStatus.ENROUTE_PATIENT);
    setTrafficState(TrafficLightState.GREEN_CORRIDOR_ACTIVE);
    addLog("GREEN CORRIDOR PROTOCOL: ACTIVE. All signals preempted.", 'success');
  };

  // Callback: Route Found from Map
  const handleRouteFound = (summary: any) => {
    const distKm = (summary.totalDistance / 1000).toFixed(1);
    const timeMin = Math.round(summary.totalTime / 60);
    setDistance(`${distKm} km`);
    setEta(`${timeMin} min`);
    addLog(`Route Calculated. Dist: ${distKm}km, ETA: ${timeMin}min`, 'info');
  };

  // Callback: Real-time Position Update from Map
  const handlePositionUpdate = (pos: Coordinate) => {
    if (trafficState === TrafficLightState.RED) {
        setSpeed(0);
    } else {
        // Higher speed simulation for hospital runs
        const base = status === MissionStatus.ENROUTE_HOSPITAL ? 80 : 50;
        const currentSpeed = Math.floor(base + Math.random() * 20);
        setSpeed(currentSpeed);
    }
  };

  // Callback: Distance Update (Running Distance)
  const handleDistanceUpdate = (meters: number) => {
      const km = (meters / 1000).toFixed(2); // Higher precision for running effect
      setDistance(`${km} km`);
  };

  // Callback: Traffic Signal Update from Map
  const handleTrafficSignalUpdate = (newState: TrafficLightState) => {
    setTrafficState(newState);
    
    if (newState === TrafficLightState.RED) {
      addLog("Intersection Alert: RED Signal Detected. Braking...", 'warning');
      setSpeed(0);
    } else if (newState === TrafficLightState.GREEN_CORRIDOR_ACTIVE) {
      if (trafficState === TrafficLightState.RED || trafficState === TrafficLightState.YELLOW) {
          addLog("Override Engaged: Green Wave Active. Accelerating.", 'success');
      }
    }
  };

  // Callback: Arrival at Target
  const handleArrival = () => {
    if (status === MissionStatus.ENROUTE_PATIENT) {
      setStatus(MissionStatus.AT_PATIENT);
      setSpeed(0);
      setTrafficState(TrafficLightState.YELLOW);
      addLog("Arrived at patient location. Medical team deploying.", 'info');
      setShowTransModal(true);
    } else if (status === MissionStatus.ENROUTE_HOSPITAL) {
      setStatus(MissionStatus.COMPLETED);
      setSpeed(0);
      setTrafficState(TrafficLightState.GREEN);
      addLog("Arrived at Hospital. Patient transfer initiated.", 'success');
      
      setTimeout(() => {
        alert("Mission Successfully Completed.");
        setView(AppView.DASHBOARD);
        setStatus(MissionStatus.IDLE);
        setTargetPos(null);
        setDistance("0.0 km");
        setEta("--:--");
        // Reset position to hospital for next run
        if(targetPos) setAmbulancePos(targetPos);
      }, 1000);
    }
  };

  const handleTransportToHospital = () => {
    setShowTransModal(false);
    
    // CRITICAL: Update ambulance start position to where the patient was found
    if(targetPos) {
        setAmbulancePos(targetPos);
    }
    
    // Set new target to Hospital
    setTargetPos(HOSPITAL_LOC);
    setStatus(MissionStatus.ENROUTE_HOSPITAL);
    
    // Reset traffic state to allow signals to control it
    setTrafficState(TrafficLightState.GREEN);
    
    addLog("Patient secured. Rerouting to Trauma Center.", 'warning');
    addLog("High Speed Protocol Engaged. Signals Syncing...", 'success');
  };

  return (
    <div className="w-screen h-screen flex flex-col relative font-sans text-gray-100 overflow-hidden">
      
      {/* View: Login */}
      {view === AppView.LOGIN && (
        <div className="flex-1 flex items-center justify-center bg-gray-900 bg-[url('https://images.unsplash.com/photo-1516110833967-0b5716ca1387?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center">
          <div className="absolute inset-0 bg-dark-bg/80 backdrop-blur-sm"></div>
          <div className="relative z-10 p-8 bg-black/60 border border-neon-green/30 rounded-xl backdrop-blur-xl w-96 shadow-[0_0_50px_rgba(0,255,157,0.1)]">
            <h1 className="text-3xl font-bold text-center mb-2 text-neon-green tracking-tighter">AEIS SYSTEM</h1>
            <p className="text-center text-xs text-neon-blue mb-8 font-mono">ADVANCED EMERGENCY INTERFACE</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Officer ID</label>
                <input type="text" className="w-full bg-black/50 border border-gray-700 p-3 text-white focus:border-neon-green focus:outline-none transition-colors font-mono" placeholder="UNIT-ALPHA-01" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Access Key</label>
                <input type="password" className="w-full bg-black/50 border border-gray-700 p-3 text-white focus:border-neon-green focus:outline-none transition-colors" placeholder="••••••••" />
              </div>
              <FuturisticButton onClick={handleLogin} className="w-full mt-4">Initialize System</FuturisticButton>
            </div>
          </div>
        </div>
      )}

      {/* View: Dashboard */}
      {view === AppView.DASHBOARD && (
        <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-dark-bg max-w-7xl mx-auto w-full overflow-y-auto">
           <div className="space-y-6">
              <div className="bg-panel-bg p-6 border border-gray-800 rounded-lg">
                 <h2 className="text-2xl font-bold text-white mb-4 border-b border-gray-800 pb-2">Mission Configuration</h2>
                 
                 <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Emergency Type</label>
                      <select 
                        className="w-full bg-black border border-gray-700 p-3 text-white rounded focus:border-neon-blue"
                        value={emergency.type}
                        onChange={(e) => setEmergency({...emergency, type: e.target.value})}
                      >
                        <option>Cardiac Arrest</option>
                        <option>Severe Trauma</option>
                        <option>Stroke</option>
                        <option>Organ Transport</option>
                      </select>
                    </div>

                    <div className="bg-black/20 p-4 border border-gray-800 rounded">
                      <label className="block text-xs text-neon-green mb-2 uppercase tracking-wide">Start Location Setup</label>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                         <input 
                           type="text" 
                           value={manualLat} 
                           onChange={(e) => setManualLat(e.target.value)}
                           className="bg-black border border-gray-700 p-2 text-xs font-mono" 
                           placeholder="Lat" 
                         />
                         <input 
                           type="text" 
                           value={manualLng} 
                           onChange={(e) => setManualLng(e.target.value)}
                           className="bg-black border border-gray-700 p-2 text-xs font-mono" 
                           placeholder="Lng" 
                         />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FuturisticButton onClick={handleAutoLocation} variant="warning" className="text-[10px] py-2">
                            <i className="fas fa-satellite-dish mr-1"></i> Auto
                        </FuturisticButton>
                        <FuturisticButton onClick={handleManualLocation} variant="primary" className="text-[10px] py-2">
                            <i className="fas fa-map-pin mr-1"></i> Set Manual
                        </FuturisticButton>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="bg-panel-bg p-6 border border-neon-green/30 rounded-lg shadow-[0_0_20px_rgba(0,255,157,0.05)]">
                 <h3 className="text-neon-green font-mono mb-4 text-sm">PRE-FLIGHT CHECKS</h3>
                 <div className="space-y-2 text-sm font-mono text-gray-400">
                    <div className="flex justify-between"><span>GPS SATELLITES</span> <span className="text-neon-green">12 LOCKED</span></div>
                    <div className="flex justify-between"><span>TRAFFIC SERVER</span> <span className="text-neon-green">ONLINE</span></div>
                    <div className="flex justify-between"><span>AI CORE</span> <span className="text-neon-blue">STANDBY</span></div>
                    <div className="flex justify-between"><span>AMBULANCE POS</span> <span className="text-white">{ambulancePos.lat.toFixed(3)}, {ambulancePos.lng.toFixed(3)}</span></div>
                 </div>
                 
                 <FuturisticButton onClick={startMission} className="w-full mt-6">
                    INITIATE EMERGENCY PROTOCOL
                 </FuturisticButton>
              </div>
           </div>

           {/* Dashboard Logs Preview */}
           <div className="h-full max-h-[600px] border border-gray-800 rounded-lg overflow-hidden">
              <AILogPanel logs={logs} />
           </div>
        </div>
      )}

      {/* View: Map Navigation */}
      {view === AppView.MAP_NAVIGATION && (
        <div className="relative flex-1 flex overflow-hidden">
          
          {/* Main Map Area */}
          <div className="flex-1 relative">
             <MapHUD 
                status={status} 
                speed={speed} 
                eta={eta} 
                distance={distance} 
                trafficState={trafficState} 
             />
             <MapComponent 
                ambulancePos={ambulancePos}
                targetPos={targetPos}
                status={status}
                onRouteFound={handleRouteFound}
                onPositionUpdate={handlePositionUpdate}
                onDistanceUpdate={handleDistanceUpdate}
                onTrafficSignalUpdate={handleTrafficSignalUpdate}
                onArrival={handleArrival}
             />
             
             {/* Bottom Controls */}
             <div className="absolute bottom-6 left-6 z-[1000] flex gap-4">
                <button 
                  onClick={() => { setView(AppView.DASHBOARD); setStatus(MissionStatus.IDLE); }} 
                  className="bg-black/80 border border-gray-600 text-white px-4 py-2 hover:bg-gray-800 backdrop-blur font-mono text-xs uppercase"
                >
                   <i className="fas fa-times mr-2"></i> Abort Mission
                </button>
             </div>
          </div>

          {/* Side Panel */}
          <div className="w-80 border-l border-gray-800 hidden md:block z-10 bg-dark-bg">
             <AILogPanel logs={logs} />
          </div>

          {/* Transmission Modal */}
          {showTransModal && (
            <div className="absolute inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center">
              <div className="w-[500px] bg-dark-bg border border-neon-green p-1 shadow-[0_0_50px_rgba(0,255,157,0.2)]">
                <div className="bg-black/40 p-6">
                  <div className="text-neon-green font-mono text-xs mb-2 animate-pulse">INCOMING TRANSMISSION...</div>
                  <h2 className="text-2xl font-bold text-white mb-4">PATIENT SECURED</h2>
                  <div className="space-y-4 mb-6 text-sm text-gray-300 font-mono">
                    <p>{'>'} Vital signs monitoring initiated.</p>
                    <p>{'>'} Route calculated to nearest Level 1 Trauma Center.</p>
                    <p>{'>'} Traffic Control System requesting Green Wave clearance.</p>
                  </div>
                  <div className="flex gap-4">
                    <FuturisticButton onClick={handleTransportToHospital} className="flex-1">
                      BEGIN TRANSPORT
                    </FuturisticButton>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default App;