import type { ReactElement } from 'react';
import { createPrivacyPolicySections } from '@collectigo/shared';
import { LegalDocumentScreen } from '../../src/components/legal/LegalDocumentScreen';
import { legalConfig } from '../../src/config/legal.config';

export default function PrivacyPolicyScreen(): ReactElement {
  const privacyContact = legalConfig.privacyEmail;
  const sections = createPrivacyPolicySections(legalConfig);

  return (
    <LegalDocumentScreen
      title="Política de privacidad"
      subtitle="Cómo tratamos tus datos"
      updatedAt={legalConfig.effectiveDateLabel}
      sections={sections}
      contactEmail={privacyContact || undefined}
      publicUrl={legalConfig.privacyPolicyUrl || undefined}
    />
  );
}
