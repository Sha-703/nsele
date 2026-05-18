import GreenhouseCard from './GreenhouseCard'

export default function GreenhouseList({ actuators = {}, greenhouses = [], onSendCommand }) {
  const items = greenhouses.length
    ? greenhouses.map((gh) => ({ id: gh.id, info: gh, state: actuators[`nsele/actuators/${gh.id}`] }))
    : Object.keys(actuators).map((topic) => ({ id: topic.split('/').pop(), info: { name: topic.split('/').pop() }, state: actuators[topic] }))

  return (
    <section className="list-grid">
      {items.length === 0 ? (
        <div className="page-card">Aucune serre trouvée.</div>
      ) : (
        items.map((item) => (
          <GreenhouseCard key={item.id} greenhouse={item} onSendCommand={onSendCommand} />
        ))
      )}
    </section>
  )
}
