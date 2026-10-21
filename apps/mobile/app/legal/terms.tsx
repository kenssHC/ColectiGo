import type { ReactElement } from 'react';
import { createTermsOfUseSections } from '@collectigo/shared';
import { LegalDocumentScreen } from '../../src/components/legal/LegalDocumentScreen';
import { legalConfig } from '../../src/config/legal.config';

export default function TermsOfUseScreen(): ReactElement {
  const supportContact = legalConfig.supportEmail || legalConfig.privacyEmail;
  const sections = createTermsOfUseSections(legalConfig);

  return (
    <LegalDocumentScreen
      title="Términos de uso"
      subtitle="Condiciones del servicio"
      updatedAt={legalConfig.effectiveDateLabel}
      sections={sections}
      contactEmail={supportContact || undefined}
    />
  );
}
