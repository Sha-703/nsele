export default function Controls({ id, onSend }) {
  return (
    <div className="controls-row">
      <button type="button" onClick={() => onSend(id, { pump: 'on' })}>Pompe ON</button>
      <button type="button" onClick={() => onSend(id, { pump: 'off' })}>Pompe OFF</button>
    </div>
  )
}
