import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { mockModelTransferJobOCI } from '~/__mocks__/mockModelTransferJob';
import { useNamespaces } from '~/app/hooks/useNamespaces';
import StorageLocationSection from '~/app/pages/modelRegistry/screens/ModelVersionDetails/StorageLocationSection';

jest.mock('~/app/hooks/useNamespaces');

const mockUseNamespaces = jest.mocked(useNamespaces);
const artifactUri = 'oci://registry.example.com/models/fraud-risk:v2';
const namespace = 'model-project';

const renderSection = (
  overrides: Partial<React.ComponentProps<typeof StorageLocationSection>> = {},
) =>
  render(
    <StorageLocationSection
      artifactUri={artifactUri}
      fallbackNamespace={namespace}
      transferJob={mockModelTransferJobOCI({ namespace })}
      transferJobLoaded
      transferJobError={undefined}
      onRetry={jest.fn()}
      {...overrides}
    />,
  );

describe('StorageLocationSection', () => {
  beforeEach(() => {
    mockUseNamespaces.mockReturnValue([[{ name: namespace }], true, undefined]);
  });

  it.each([undefined, new Error('Namespace discovery returned HTTP 404')])(
    'should display loaded transfer metadata while namespace discovery is unavailable (%s)',
    (error) => {
      mockUseNamespaces.mockReturnValue([[], false, error]);

      renderSection();

      expect(screen.getByTestId('storage-location-uri')).toHaveTextContent(artifactUri);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    },
  );

  it('should wait until transfer-job retrieval finishes', () => {
    renderSection({ transferJob: null, transferJobLoaded: false });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('storage-location-uri')).not.toBeInTheDocument();
  });

  it('should await the namespace access decision when no transfer job is available', () => {
    mockUseNamespaces.mockReturnValue([[], false, undefined]);

    renderSection({ transferJob: null });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should retain the access warning when the namespace is not accessible', () => {
    mockUseNamespaces.mockReturnValue([[], true, undefined]);

    renderSection({ transferJob: null });

    expect(screen.getByTestId('no-access-popover-button')).toBeInTheDocument();
    expect(screen.queryByTestId('storage-location-uri')).not.toBeInTheDocument();
  });

  it('should retain the unavailable state when an accessible namespace has no transfer job', () => {
    renderSection({ transferJob: null });

    expect(screen.getByText('Storage information unavailable.')).toBeInTheDocument();
  });

  it('should retain transfer-job retrieval errors', () => {
    mockUseNamespaces.mockReturnValue([[], false, new Error('Namespace discovery failed')]);

    renderSection({ transferJob: null, transferJobError: new Error('Transfer retrieval failed') });

    expect(screen.getByText('Transfer retrieval failed')).toBeInTheDocument();
  });

  it('should display normally loaded transfer metadata', () => {
    renderSection();

    expect(screen.getByTestId('storage-location-uri')).toHaveTextContent(artifactUri);
  });
});
