import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const researchTargets = [
  // Germany
  { name: 'Technical University of Munich', region: 'de', sector: 'academic' },
  { name: 'LMU Munich', region: 'de', sector: 'academic' },
  { name: 'Max Planck Institute for Heart and Lung Research', region: 'de', sector: 'academic' },
  { name: 'German Center for Cardiovascular Research', region: 'de', sector: 'government' },
  { name: 'Heidelberg University', region: 'de', sector: 'academic' },
  { name: 'Charité – Universitätsmedizin Berlin', region: 'de', sector: 'academic' },
  { name: 'Helmholtz Association', region: 'de', sector: 'government' },
  { name: 'Fraunhofer Institute for Cell Therapy and Immunology', region: 'de', sector: 'government' },

  // Canada
  { name: 'University of Toronto', region: 'ca', sector: 'academic' },
  { name: 'McGill University', region: 'ca', sector: 'academic' },
  { name: 'University of British Columbia', region: 'ca', sector: 'academic' },
  { name: 'SickKids Research Institute', region: 'ca', sector: 'academic' },
  { name: 'Canadian Institutes of Health Research', region: 'ca', sector: 'government' },
  { name: 'University of Alberta', region: 'ca', sector: 'academic' },
  { name: 'Montreal Heart Institute', region: 'ca', sector: 'academic' },

  // Singapore
  { name: 'National University of Singapore', region: 'sg', sector: 'academic' },
  { name: 'Nanyang Technological University', region: 'sg', sector: 'academic' },
  { name: 'A*STAR Agency', region: 'sg', sector: 'government' },
  { name: 'National Heart Centre Singapore', region: 'sg', sector: 'government' },
  { name: 'Duke-NUS Medical School', region: 'sg', sector: 'academic' },
  { name: 'Singapore Heart Foundation', region: 'sg', sector: 'government' },

  // India
  { name: 'AIIMS Delhi', region: 'in', sector: 'government' },
  { name: 'Indian Institute of Science', region: 'in', sector: 'academic' },
  { name: 'Tata Memorial Centre', region: 'in', sector: 'government' },
  { name: 'CSIR-Institute of Genomics and Integrative Biology', region: 'in', sector: 'government' },
  { name: 'Indian Council of Medical Research', region: 'in', sector: 'government' },
  { name: 'Christian Medical College Vellore', region: 'in', sector: 'academic' },
  { name: 'National Centre for Biological Sciences', region: 'in', sector: 'academic' }
];

async function seedPoojaResearch() {
  try {
    for (const target of researchTargets) {
      await prisma.targetCompany.upsert({
        where: { name: target.name },
        update: {
          ...target,
          candidateId: 'pooja',
          keywords: ['Cardiovascular', 'Molecular Biology', 'Clinical Validation', 'Genomics']
        },
        create: {
          ...target,
          candidateId: 'pooja',
          keywords: ['Cardiovascular', 'Molecular Biology', 'Clinical Validation', 'Genomics']
        }
      });
    }
    console.log('Successfully seeded Pooja research targets');
  } catch (error) {
    console.error('Error seeding research targets:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedPoojaResearch();
