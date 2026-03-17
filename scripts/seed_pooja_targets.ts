import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const researchTargets = [
  // Germany
  { name: 'Technical University of Munich', region: 'de', sector: 'academic' },
  { name: 'LMU Munich', region: 'de', sector: 'academic' },
  { name: 'Max Planck Institutes', region: 'de', sector: 'academic' },
  // Canada
  { name: 'University of Toronto', region: 'ca', sector: 'academic' },
  { name: 'McGill University', region: 'ca', sector: 'academic' },
  // Singapore
  { name: 'National University of Singapore', region: 'sg', sector: 'academic' },
  { name: 'A*STAR Research Institutes', region: 'sg', sector: 'academic' },
  // India
  { name: 'AIIMS Delhi', region: 'in', sector: 'government' },
  { name: 'Indian Institute of Science', region: 'in', sector: 'academic' }
];

async function seedPoojaTargets() {
  await prisma.targetCompany.createMany({
    data: researchTargets.map(company => ({
      ...company,
      candidateId: 'pooja',
      keywords: ['Cardiovascular', 'Molecular Biology', 'Clinical Validation', 'Genomics']
    })),
    skipDuplicates: true
  });
  console.log('Successfully seeded Pooja research targets');
}

seedPoojaTargets()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
