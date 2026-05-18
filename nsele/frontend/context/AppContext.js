import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '../lib/mqttClient'
import { getGreenhouses } from '../lib/api'

const AppContext = createContext(null)

export function useApp() {
  return useContext(AppContext)
}

export function AppProvider({ children }) {
  const [client, setClient] = useState(null)
  // mqttData stockera toutes les métriques reçues.
  // Exemple de clé attendue depuis l'ESP32 : "S1C1TS" = 25
  // (S1 = Serre 1, C1 = Compartiment 1, TS = Température du Sol)
  const [mqttData, setMqttData] = useState({})
  const [greenhouses, setGreenhouses] = useState([])

  useEffect(() => {
    getGreenhouses().then((data) => {
      if (Array.isArray(data)) {
        setGreenhouses(data)
      }
    })
  }, [])

  useEffect(() => {
    const c = createClient()
    setClient(c)
    c.on('connect', () => console.log('MQTT connecté.'))
    c.on('message', (topic, payload) => {
      try {
        const msg = JSON.parse(payload.toString())
        // msg peut contenir des données formatées comme {"S1C1TS": 25.5}
        // On fusionne les nouvelles valeurs avec l'état précédent pour garder l'historique
        setMqttData((prev) => ({ ...prev, ...msg, [topic]: msg }))
      } catch (error) {
        console.warn('MQTT parse error', error)
      }
    })
    
    // On s'abonne aux topics des capteurs (pour la data) et des actionneurs (pour leur état)
    c.subscribe('nsele/sensors/#')
    c.subscribe('nsele/actuators/#')
    return () => c.end()
  }, [])

  // Fonction pour envoyer une commande manuelle depuis le Dashboard
  // Ex: envoyer {"pump": "on"} sur le topic "nsele/actuators/S1/C1"
  const sendCommand = (ghId, compId, action) => {
    if (!client) return
    const payload = action === 'arrosage' ? { pump: 'on' } : { cooling: 'on' }
    client.publish(`nsele/actuators/${ghId}/${compId}`, JSON.stringify(payload))
  }

  return (
    <AppContext.Provider value={{ client, mqttData, greenhouses, sendCommand }}>
      {children}
    </AppContext.Provider>
  )
}
