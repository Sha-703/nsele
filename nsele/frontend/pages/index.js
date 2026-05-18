import Layout from '../components/Layout'
import GreenhouseBar from '../components/GreenhouseBar'
import CompartmentCard from '../components/CompartmentCard'
import SensorChart from '../components/SensorChart'
import { useApp } from '../context/AppContext'
import { useState, useEffect, useRef } from 'react'

export default function Dashboard() {
  const { greenhouses, mqttData } = useApp()
  const [selectedId, setSelectedId] = useState('S1')
  const [history, setHistory] = useState([])

  const mqttDataRef = useRef(mqttData)
  useEffect(() => { mqttDataRef.current = mqttData }, [mqttData])

  useEffect(() => {
    if (greenhouses.length > 0 && !greenhouses.find(g => g.id === selectedId)) {
      setSelectedId(greenhouses[0].id)
    }
  }, [greenhouses])

  useEffect(() => {
    setHistory([])
    const timer = setInterval(() => {
      const currentData = mqttDataRef.current
      let TA=0, TS=0, HA=0, HS=0, count=0;
      for(let i=1; i<=4; i++) {
        if(currentData[`${selectedId}C${i}TA`] !== undefined) {
          TA += currentData[`${selectedId}C${i}TA`]
          TS += currentData[`${selectedId}C${i}TS`]
          HA += currentData[`${selectedId}C${i}HA`]
          HS += currentData[`${selectedId}C${i}HS`]
          count++
        }
      }
      
      let pt = count > 0 
        ? { time: new Date().toLocaleTimeString(), TA: TA/count, TS: TS/count, HA: HA/count, HS: HS/count }
        : { time: new Date().toLocaleTimeString(), TA: 26+Math.random()*2, TS: 22+Math.random(), HA: 65+Math.random()*4, HS: 45+Math.random()*5 }
      
      setHistory(h => [...h.slice(-19), pt])
    }, 2500)
    
    return () => clearInterval(timer)
  }, [selectedId])

  const currentGh = greenhouses.find(g => g.id === selectedId)

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <GreenhouseBar selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      
      {currentGh ? (
        <div className="bento-dashboard">
          
          {/* Colonne de Gauche : Vue d'ensemble et Graphique */}
          <div className="bento-left">
            <div className="hero" style={{ padding: 20, marginBottom: 20 }}>
              <h2 style={{ margin: '0 0 8px' }}>{currentGh.name}</h2>
              <p className="subtle" style={{ margin: 0 }}>Culture actuelle: {currentGh.culture}</p>
            </div>
            
            <div className="card chart-card" style={{ height: '100%', minHeight: 400 }}>
              <h3 style={{marginTop: 0, marginBottom: 16}}>Évolution Globale (Moyenne)</h3>
              <div style={{ position: 'relative', height: 'calc(100% - 40px)' }}>
                <SensorChart data={history} />
              </div>
            </div>
          </div>
          
          {/* Colonne de Droite : Les 4 Compartiments */}
          <div className="bento-right">
            <div className="compartments-grid">
              <CompartmentCard greenhouseId={selectedId} compId="C1" compName="Compartiment 1" />
              <CompartmentCard greenhouseId={selectedId} compId="C2" compName="Compartiment 2" />
              <CompartmentCard greenhouseId={selectedId} compId="C3" compName="Compartiment 3" />
              <CompartmentCard greenhouseId={selectedId} compId="C4" compName="Compartiment 4" />
            </div>
          </div>

        </div>
      ) : (
        <div className="page-card">Chargement ou aucune serre trouvée...</div>
      )}
    </Layout>
  )
}
