import { prisma } from '../db/prisma.js';
import { DOCTOR_APPROVED_DATASET, DoctorMedicineRecord } from './knowledgeData.js';

export interface RetrievedKnowledgeChunk {
  id: string;
  documentId: string;
  category: string;
  content: string;
  isApproved: boolean;
  isEnabled: boolean;
  metadata: any;
  citation?: string;
  relevanceScore?: number;
}

class KnowledgeService {
  private hasEnsuredSeed = false;

  /**
   * Idempotently seeds the doctor-approved Electropathy Materia Medica and clinical protocols
   * into PostgreSQL KnowledgeDocument and KnowledgeChunk if not already populated.
   */
  async ensureKnowledgeSeeded(): Promise<void> {
    if (this.hasEnsuredSeed) return;

    try {
      const existingDoc = await prisma.knowledgeDocument.findFirst({
        where: { fileName: 'Dr_Wandhare_Electropathy_Materia_Medica.json' }
      });

      if (!existingDoc) {
        console.log('[KNOWLEDGE SERVICE] Seeding doctor-approved Electropathy dataset into PostgreSQL...');
        
        const doc = await prisma.knowledgeDocument.create({
          data: {
            fileName: 'Dr_Wandhare_Electropathy_Materia_Medica.json',
            fileType: 'application/json',
            fileUrl: 'internal://datasets/dr_wandhare_protocols_v1',
            status: 'approved',
            totalChunks: DOCTOR_APPROVED_DATASET.length
          }
        });

        let chunkIdx = 0;
        for (const item of DOCTOR_APPROVED_DATASET) {
          chunkIdx++;
          const formattedContent = this.formatRecordToContent(item);

          await prisma.knowledgeChunk.create({
            data: {
              documentId: doc.id,
              content: formattedContent,
              category: item.category,
              language: 'en',
              chunkIndex: chunkIdx,
              isApproved: true,
              isEnabled: true,
              metadata: {
                conditionOrTitle: item.conditionOrTitle,
                symptoms: item.symptoms,
                remedies: item.remedies,
                recommendedDilution: item.recommendedDilution,
                administration: item.administration,
                externalApplication: item.externalApplication,
                temperamentConsiderations: item.temperamentConsiderations,
                precautions: item.precautions,
                contraindications: item.contraindications,
                citation: item.citation
              }
            }
          });
        }
        console.log(`[KNOWLEDGE SERVICE] Successfully seeded ${DOCTOR_APPROVED_DATASET.length} approved knowledge chunks.`);
      }
      this.hasEnsuredSeed = true;
    } catch (err) {
      console.error('[KNOWLEDGE SERVICE] Error during knowledge base verification:', err);
    }
  }

  private formatRecordToContent(item: DoctorMedicineRecord): string {
    const remediesStr = item.remedies.map(r => `• ${r.name} (${r.code}): ${r.role}`).join('\n');
    const precautionsStr = item.precautions.map(p => `• ${p}`).join('\n');
    const contraStr = item.contraindications.map(c => `• ${c}`).join('\n');

    return `CONDITION / PROTOCOL: ${item.conditionOrTitle}
CATEGORY: ${item.category}
KEY SYMPTOMS / INDICATIONS: ${item.symptoms.join(', ')}

DOCTOR-APPROVED REMEDIES:
${remediesStr}

RECOMMENDED DILUTION & POTENCY:
${item.recommendedDilution}

ADMINISTRATION & DOSAGE:
${item.administration}
${item.externalApplication ? `\nEXTERNAL APPLICATION:\n${item.externalApplication}` : ''}
${item.temperamentConsiderations ? `\nCONSTITUTION / TEMPERAMENT:\n${item.temperamentConsiderations}` : ''}

CLINICAL PRECAUTIONS:
${precautionsStr}

CONTRAINDICATIONS:
${contraStr}

SOURCE REFERENCE:
${item.citation}`;
  }

  /**
   * Retrieves matching approved and enabled knowledge records from PostgreSQL in real-time.
   * Never relies on stale memory cache; always checks current DB records.
   */
  async findMatchingKnowledge(
    queryText: string,
    options?: { category?: string; limit?: number }
  ): Promise<RetrievedKnowledgeChunk[]> {
    await this.ensureKnowledgeSeeded();

    const limit = options?.limit || 5;
    const cleanQuery = queryText.toLowerCase().trim();
    if (!cleanQuery) return [];

    // Query all approved, enabled chunks directly from PostgreSQL
    const whereClause: any = {
      isApproved: true,
      isEnabled: true
    };
    if (options?.category) {
      whereClause.category = options.category;
    }

    const chunks = await prisma.knowledgeChunk.findMany({
      where: whereClause,
      include: {
        document: {
          select: { fileName: true, status: true }
        }
      }
    });

    // Score chunks against query keywords and medical concepts
    const scoredChunks = chunks.map((chunk) => {
      let score = 0;
      const contentLower = chunk.content.toLowerCase();
      const meta = (chunk.metadata as any) || {};
      const conditionLower = (meta.conditionOrTitle || '').toLowerCase();
      const symptomsList: string[] = Array.isArray(meta.symptoms) ? meta.symptoms : [];

      // Keyword token extraction (ignoring common stop words)
      const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'have', 'has', 'patient', 'years', 'old', 'what', 'give', 'how', 'when', 'does', 'take']);
      const queryTokens = cleanQuery
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2 && !stopWords.has(t));

      // Direct condition title match
      if (conditionLower && cleanQuery.includes(conditionLower)) {
        score += 40;
      }

      // Check symptoms match
      for (const symptom of symptomsList) {
        const sLower = symptom.toLowerCase();
        if (cleanQuery.includes(sLower) || sLower.includes(cleanQuery)) {
          score += 30;
        } else {
          for (const token of queryTokens) {
            if (sLower.includes(token)) score += 8;
          }
        }
      }

      // Check remedy names / codes match (e.g. S6, Scrofoloso, F1, Pettorale)
      const remediesList: any[] = Array.isArray(meta.remedies) ? meta.remedies : [];
      for (const rem of remediesList) {
        const nameLower = (rem.name || '').toLowerCase();
        const codeLower = (rem.code || '').toLowerCase();
        if (cleanQuery.includes(nameLower)) score += 25;
        if (cleanQuery.includes(codeLower)) score += 20;
      }

      // Check content token hits
      for (const token of queryTokens) {
        if (contentLower.includes(token)) score += 3;
      }

      return {
        id: chunk.id,
        documentId: chunk.documentId,
        category: chunk.category || 'General',
        content: chunk.content,
        isApproved: chunk.isApproved,
        isEnabled: chunk.isEnabled,
        metadata: chunk.metadata,
        citation: meta.citation || chunk.document.fileName,
        relevanceScore: score
      };
    });

    // Filter to relevant matches (threshold > 10) and sort descending
    const filtered = scoredChunks
      .filter(c => (c.relevanceScore || 0) >= 10)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, limit);

    return filtered;
  }

  /**
   * Get all approved chunks for admin review or debugging
   */
  async getAllApprovedChunks(page = 1, limit = 50) {
    await this.ensureKnowledgeSeeded();
    const skip = (page - 1) * limit;

    const [total, chunks] = await Promise.all([
      prisma.knowledgeChunk.count({ where: { isApproved: true, isEnabled: true } }),
      prisma.knowledgeChunk.findMany({
        where: { isApproved: true, isEnabled: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          document: {
            select: { id: true, fileName: true, status: true }
          }
        }
      })
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      chunks: chunks.map(c => ({
        id: c.id,
        documentId: c.documentId,
        fileName: c.document.fileName,
        category: c.category,
        content: c.content,
        metadata: c.metadata,
        isApproved: c.isApproved,
        isEnabled: c.isEnabled,
        createdAt: c.createdAt
      }))
    };
  }
}

export const knowledgeService = new KnowledgeService();
