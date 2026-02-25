import { ExternalLink, Code } from 'lucide-react'

const techColors = {
  'React': 'bg-golf-blue/40 text-golf-brown',
  'TypeScript': 'bg-golf-blue/60 text-golf-brown',
  'Tailwind CSS': 'bg-golf-green/40 text-golf-brown',
  'Framer Motion': 'bg-golf-pink/40 text-golf-brown',
  'Node.js': 'bg-golf-green/60 text-golf-brown',
  'Spotify API': 'bg-golf-green/40 text-golf-brown',
  'Vite': 'bg-golf-pink/30 text-golf-brown',
}

function TechTag({ tech }) {
  const colorClass = techColors[tech] || 'bg-golf-cream border border-golf-brown/20 text-golf-brown'
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}>
      {tech}
    </span>
  )
}

export default function ProjectCard({ name, description, techs, githubUrl, deployUrl }) {
  return (
    <article className="bg-white/60 border border-golf-brown/10 rounded-xl p-6 flex flex-col gap-4 transition-all duration-200 hover:shadow-md hover:border-golf-pink/60">
      <div>
        <h3 className="text-xl font-semibold text-golf-brown mb-2">{name}</h3>
        <p className="text-golf-brown/70 text-sm leading-relaxed">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {techs.map((tech) => (
          <TechTag key={tech} tech={tech} />
        ))}
      </div>

      <div className="flex gap-3 mt-auto pt-2">
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ver código do projeto ${name} no GitHub`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-golf-brown/70 hover:text-golf-brown transition-colors duration-200"
        >
          <Code size={15} aria-hidden="true" />
          Ver Código
        </a>
        <a
          href={deployUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ver deploy do projeto ${name}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-golf-brown/70 hover:text-golf-brown transition-colors duration-200"
        >
          <ExternalLink size={15} aria-hidden="true" />
          Ver Deploy
        </a>
      </div>
    </article>
  )
}
