import { useState } from 'react'
import Layout from '../components/Layout'
import { updateGreenhouse } from '../lib/api'
import { useApp } from '../context/AppContext'

export default function Settings() {
  const { greenhouses } = useApp()
  const [selectedId, setSelectedId] = useState('S1')
  const [culture, setCulture] = useState('Tomates')
  const [message, setMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const response = await updateGreenhouse(selectedId, { culture })
    if (response?.status === 'updated') {
      setMessage(`Culture mise à jour pour la serre ${selectedId} !`)
      // Rafraichit la page pour que le contexte récupère la nouvelle culture
      setTimeout(() => window.location.reload(), 1500)
    }
  }

  return (
    <Layout>
      <div className="page-card">
        <h1 style={{marginTop: 0}}>Paramètres des Serres</h1>
        <p className="subtle" style={{marginBottom: 24}}>Modifiez la culture assignée à chaque serre.</p>
        
        <form onSubmit={handleSubmit} className="form-grid" style={{maxWidth: 400}}>
          <label>
            Choisir la serre
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {greenhouses.map(gh => (
                <option key={gh.id} value={gh.id}>{gh.name} (Actuel: {gh.culture})</option>
              ))}
            </select>
          </label>
          
          <label>
            Nouvelle Culture
            <select value={culture} onChange={(e) => setCulture(e.target.value)}>
              <option value="Tomates">Tomates</option>
              <option value="Poivrons">Poivrons</option>
              <option value="Laitue">Laitue</option>
              <option value="Fraises">Fraises</option>
              <option value="Aubergines">Aubergines</option>
            </select>
          </label>
          
          <button type="submit" className="btn-primary" style={{marginTop: 10}}>Enregistrer la modification</button>
        </form>
        
        {message && <p className="success">{message}</p>}
      </div>
    </Layout>
  )
}
