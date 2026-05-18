import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

export default function SensorChart({ data }) {
  const chartRef = useRef()
  const chartInstance = useRef()

  useEffect(() => {
    if (!chartRef.current) return
    if (chartInstance.current) chartInstance.current.destroy()
    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: data.map(d => d.time),
        datasets: [
          {
            label: 'Temp. Air (°C)',
            data: data.map(d => d.TA),
            borderColor: '#f59e42',
            tension: 0.3,
            fill: false,
          },
          {
            label: 'Temp. Sol (°C)',
            data: data.map(d => d.TS),
            borderColor: '#eab308',
            tension: 0.3,
            fill: false,
          },
          {
            label: 'Humidité Air (%)',
            data: data.map(d => d.HA),
            borderColor: '#3b82f6',
            tension: 0.3,
            fill: false,
          },
          {
            label: 'Humidité Sol (%)',
            data: data.map(d => d.HS),
            borderColor: '#10b981',
            tension: 0.3,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { x: { display: true }, y: { display: true } },
      },
    })
    return () => chartInstance.current?.destroy()
  }, [data])

  return <canvas ref={chartRef} height={220} />
}
