import { useApp } from '../context/AppContext'

export default function GreenhouseBar({ selectedId, onSelect }) {
  const { greenhouses } = useApp()
  return (
    <div className="greenhouse-bar">
      {greenhouses.map(gh => (
        <div key={gh.id} className={selectedId === gh.id ? 'gh-item selected' : 'gh-item'} onClick={onSelect ? () => onSelect(gh.id) : undefined}>
          <span className="gh-name">{gh.name}</span>
          <span className="gh-culture">{gh.culture}</span>
        </div>
      ))}
    </div>
  )
}
