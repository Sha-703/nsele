import Controls from './Controls'
import { useRouter } from 'next/router'

export default function GreenhouseCard({ greenhouse, onSendCommand }) {
  const { id, info, state } = greenhouse
  const router = useRouter()

  const handleCardClick = (e) => {
    // Ne pas naviguer si on clique sur un bouton
    if (e.target.tagName === 'BUTTON') return
    router.push(`/greenhouses/${id}`)
  }

  return (
    <article className="card" style={{ cursor: 'pointer' }} onClick={handleCardClick}>
      <div className="card-header">
        <div>
          <h3>{info.name || id}</h3>
          <p className="subtle">Culture: {info.culture || 'Inconnue'}</p>
        </div>
        <span className="badge">{info.status || 'OK'}</span>
      </div>
      <pre className="state-box">{JSON.stringify(state || { status: 'Inconnu' }, null, 2)}</pre>
      <Controls id={id} onSend={onSendCommand} />
    </article>
  )
}
