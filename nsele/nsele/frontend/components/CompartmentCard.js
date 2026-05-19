import { useApp } from '../context/AppContext'

export default function CompartmentCard({ greenhouseId, compId, compName }) {
  const { mqttData, sendCommand } = useApp()
  
  // Fonction pour reconstruire la clé exacte envoyée par les capteurs (ESP32)
  // Par exemple, pour S1 (serre), C1 (compartiment) et le capteur TS (Temp Sol), on obtient : "S1C1TS"
  const getVal = (sensor) => {
    const key = `${greenhouseId}${compId}${sensor}`
    return mqttData && mqttData[key] !== undefined ? mqttData[key] : '--'
  }

  return (
    <article className="card compartment-card">
      <div className="card-header" style={{ marginBottom: 12 }}>
        <h3>{compName}</h3>
        <span className="badge">Actif</span>
      </div>
      
      <div className="sensors-grid">
        <div className="sensor-item">
          <span className="sensor-icon">🌡️</span>
          <div className="sensor-info">
            <span className="sensor-label">Temp. Air</span>
            <span className="sensor-val">{getVal('TA')} °C</span>
          </div>
        </div>
        <div className="sensor-item">
          <span className="sensor-icon">🌱</span>
          <div className="sensor-info">
            <span className="sensor-label">Temp. Sol</span>
            <span className="sensor-val">{getVal('TS')} °C</span>
          </div>
        </div>
        <div className="sensor-item">
          <span className="sensor-icon">💧</span>
          <div className="sensor-info">
            <span className="sensor-label">Hum. Air</span>
            <span className="sensor-val">{getVal('HA')} %</span>
          </div>
        </div>
        <div className="sensor-item">
          <span className="sensor-icon">🪴</span>
          <div className="sensor-info">
            <span className="sensor-label">Hum. Sol</span>
            <span className="sensor-val">{getVal('HS')} %</span>
          </div>
        </div>
      </div>
      
      <div className="controls-row">
        {/* Boutons d'actionneurs. Ils appellent sendCommand() avec l'ID de la serre (ex: S1) et du compartiment (ex: C1) */}
        <button type="button" className="btn-primary" onClick={() => sendCommand(greenhouseId, compId, 'arrosage')}>💧 Arrosage</button>
        <button type="button" className="btn-secondary" onClick={() => sendCommand(greenhouseId, compId, 'cooling')}>❄️ Cooling</button>
      </div>
    </article>
  )
}
