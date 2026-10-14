import '@testing-library/jest-dom';
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import useModelArtifactsByVersionId from '~/app/hooks/useModelArtifactsByVersionId';
import useModelVersionsByRegisteredModel from '~/app/hooks/useModelVersionsByRegisteredModel';
import { ModelArtifact, ModelVersion, RegisteredModel } from '~/app/types';
import {
  ModelLocationType,
  RegisterVersionFormData,
} from '~/app/pages/modelRegistry/screens/RegisterModel/useRegisterModelData';
import {
  PrefillableRegisterVersionField,
  usePrefillRegisterVersionFields,
} from '~/app/pages/modelRegistry/screens/RegisterModel/usePrefillRegisterVersionFields';

jest.mock('~/app/hooks/useModelArtifactsByVersionId', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('~/app/hooks/useModelVersionsByRegisteredModel', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseModelArtifactsByVersionId = jest.mocked(useModelArtifactsByVersionId);
const mockUseModelVersionsByRegisteredModel = jest.mocked(useModelVersionsByRegisteredModel);

const emptyFormData = (): RegisterVersionFormData => ({
  versionName: '',
  versionDescription: '',
  sourceModelFormat: '',
  sourceModelFormatVersion: '',
  modelLocationType: ModelLocationType.ObjectStorage,
  modelLocationEndpoint: '',
  modelLocationBucket: '',
  modelLocationRegion: '',
  modelLocationPath: '',
  modelLocationURI: '',
  modelLocationS3AccessKeyId: '',
  modelLocationS3SecretAccessKey: '',
  destinationOciRegistry: '',
  destinationOciUsername: '',
  destinationOciPassword: '',
  destinationOciUri: '',
  namespace: '',
  jobName: '',
  jobResourceName: '',
  registeredModelId: 'registered-model-id',
});

const fetchState = <T,>(items: T[], loaded: boolean) =>
  [{ items }, loaded, undefined] as unknown as ReturnType<typeof useModelVersionsByRegisteredModel>;

const registeredModel = { id: 'registered-model-id' } as unknown as RegisteredModel;
const latestVersion = {
  id: 'version-id',
  state: 'LIVE',
  createTimeSinceEpoch: '1',
} as unknown as ModelVersion;
const latestArtifact = {
  uri: 'oci://registry.example.com/models/fraud-risk:v2',
  modelFormatName: 'ONNX',
  modelFormatVersion: '1',
  createTimeSinceEpoch: '1',
} as unknown as ModelArtifact;

describe('usePrefillRegisterVersionFields', () => {
  beforeEach(() => {
    mockUseModelVersionsByRegisteredModel.mockReturnValue(fetchState([], false));
    mockUseModelArtifactsByVersionId.mockReturnValue(
      fetchState([], false) as unknown as ReturnType<typeof useModelArtifactsByVersionId>,
    );
  });

  it('preserves storage values entered while the selected model prefill is loading', () => {
    const { result, rerender } = renderHook(() => {
      const [formData, setFormData] = React.useState(emptyFormData);
      const editedFields = React.useRef(new Set<PrefillableRegisterVersionField>());
      const setData = React.useCallback<UpdateObjectAtPropAndValue<RegisterVersionFormData>>(
        (key, value) => {
          setFormData((previous) => ({ ...previous, [key]: value }));
        },
        [],
      );
      const setUserData = React.useCallback(
        (
          key: 'modelLocationEndpoint' | 'modelLocationBucket' | 'modelLocationRegion',
          value: string,
        ) => {
          editedFields.current.add(key);
          setData(key, value);
        },
        [setData],
      );
      const prefill = usePrefillRegisterVersionFields({
        registeredModel,
        setData,
        isFieldDirty: (field) => editedFields.current.has(field),
      });

      return { formData, setUserData, prefill };
    });

    act(() => {
      result.current.setUserData('modelLocationEndpoint', 'http://model-source.example.test:9000');
      result.current.setUserData('modelLocationBucket', 'trained-models');
      result.current.setUserData('modelLocationRegion', 'us-east-1');
    });

    mockUseModelVersionsByRegisteredModel.mockReturnValue(fetchState([latestVersion], true));
    mockUseModelArtifactsByVersionId.mockReturnValue(
      fetchState([latestArtifact], true) as unknown as ReturnType<
        typeof useModelArtifactsByVersionId
      >,
    );
    rerender();

    expect(result.current.formData).toEqual(
      expect.objectContaining({
        modelLocationEndpoint: 'http://model-source.example.test:9000',
        modelLocationBucket: 'trained-models',
        modelLocationRegion: 'us-east-1',
        sourceModelFormat: 'ONNX',
        sourceModelFormatVersion: '1',
      }),
    );
  });
});
