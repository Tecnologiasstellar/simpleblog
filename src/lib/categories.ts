// src/lib/categories.ts
export interface CategoryConfig {
  label: string;
  slug: string;
  emoji: string;
  color: string;
  accentColor: string;
  description: string;
}

export const categories: CategoryConfig[] = [
  {
    label: 'Técnicas para Dormir',
    slug: 'tecnicas-para-dormir',
    emoji: '🧘',
    color: '#E8F4FF',
    accentColor: '#2D3A8C',
    description: 'Métodos probados para conciliar el sueño más rápido y descansar mejor.',
  },
  {
    label: 'Higiene del Sueño',
    slug: 'higiene-del-sueno',
    emoji: '🛁',
    color: '#F0F9FF',
    accentColor: '#0284C7',
    description: 'Hábitos y rutinas nocturnas que preparan tu mente y cuerpo para un descanso óptimo.',
  },
  {
    label: 'Remedios Naturales',
    slug: 'remedios-naturales',
    emoji: '🌿',
    color: '#F0FDF4',
    accentColor: '#15803D',
    description: 'Infusiones, suplementos y soluciones naturales para mejorar tu descanso.',
  },
  {
    label: 'Trastornos del Sueño',
    slug: 'trastornos-del-sueno',
    emoji: '😴',
    color: '#FFF1F2',
    accentColor: '#BE185D',
    description: 'Información sobre insomnio, apnea y otros trastornos comunes del sueño.',
  },
  {
    label: 'Ciencia del Sueño',
    slug: 'ciencia-del-sueno',
    emoji: '🔬',
    color: '#EFF6FF',
    accentColor: '#1D4ED8',
    description: 'Entiende cómo funciona el sueño y por qué tu cuerpo lo necesita.',
  },
  {
    label: 'Nutrición y Sueño',
    slug: 'nutricion-y-sueno',
    emoji: '🥗',
    color: '#FFFBEB',
    accentColor: '#92400E',
    description: 'Alimentos y hábitos de alimentación que favorecen o perjudican tu descanso nocturno.',
  },
  {
    label: 'Sueño por Etapa de Vida',
    slug: 'sueno-por-etapa',
    emoji: '👶',
    color: '#FDF4FF',
    accentColor: '#7E22CE',
    description: 'Guías de sueño adaptadas a cada etapa: bebés, niños, adolescentes y adultos mayores.',
  },
  {
    label: 'Situaciones Especiales',
    slug: 'situaciones-especiales',
    emoji: '✈️',
    color: '#F0FDFA',
    accentColor: '#0F766E',
    description: 'Cómo dormir bien durante viajes, cambios de horario y circunstancias inusuales.',
  },
  {
    label: 'Productos para Dormir',
    slug: 'productos-para-dormir',
    emoji: '🛏️',
    color: '#FFF7ED',
    accentColor: '#C2410C',
    description: 'Colchones, almohadas, máscaras y gadgets analizados para que elijas bien.',
  },
  {
    label: 'Estilo de Vida y Sueño',
    slug: 'estilo-de-vida',
    emoji: '🌅',
    color: '#FFF5F5',
    accentColor: '#B91C1C',
    description: 'El impacto del ejercicio, el estrés y la tecnología en la calidad de tu sueño.',
  },
];

export function getCategoryBySlug(slug: string): CategoryConfig | undefined {
  return categories.find(c => c.slug === slug);
}
