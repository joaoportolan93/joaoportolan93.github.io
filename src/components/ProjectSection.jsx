import { motion } from 'framer-motion'
import ProjectCard from './ProjectCard'

const projects = [
  {
    name: 'DreamShare',
    description: 'Landing page responsiva com animações de scroll. Foco em performance e acessibilidade.',
    techs: ['React', 'Tailwind CSS', 'Framer Motion'],
    githubUrl: '#',
    deployUrl: '#',
  },
  {
    name: 'Sonora',
    description: 'Player de música com integração de API. Interface limpa e experiência de usuário fluida.',
    techs: ['React', 'TypeScript', 'Spotify API'],
    githubUrl: '#',
    deployUrl: '#',
  },
  {
    name: 'Portfolio v2',
    description: 'Este portfólio. Design system próprio com paleta pastel e componentes reutilizáveis.',
    techs: ['React', 'Tailwind CSS', 'Vite'],
    githubUrl: 'https://github.com/joaoportolan93/joaoportolan93.github.io',
    deployUrl: 'https://joaoportolan.me',
  },
]

export default function ProjectSection() {
  return (
    <section className="px-6 py-20" aria-labelledby="projects-heading">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h2
            id="projects-heading"
            className="text-3xl font-bold text-golf-brown mb-2"
          >
            Proof of Work
          </h2>
          <p className="text-golf-brown/60 mb-10 text-base">Projetos que mostram o que sei fazer.</p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <motion.div
              key={project.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
            >
              <ProjectCard {...project} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
