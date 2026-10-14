import React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { RegisteredModel, ModelVersion, ModelArtifact } from '~/app/types';
import { filterLiveVersions, getLastCreatedItem, uriToStorageFields } from '~/app/utils';
import useModelArtifactsByVersionId from '~/app/hooks/useModelArtifactsByVersionId';
import useModelVersionsByRegisteredModel from '~/app/hooks/useModelVersionsByRegisteredModel';
import { RegisterVersionFormData, ModelLocationType } from './useRegisterModelData';

export type PrefillableRegisterVersionField =
  | 'sourceModelFormat'
  | 'sourceModelFormatVersion'
  | 'modelLocationType'
  | 'modelLocationEndpoint'
  | 'modelLocationBucket'
  | 'modelLocationRegion';

type UsePrefillRegisterVersionFieldsArgs = {
  registeredModel?: RegisteredModel;
  setData: UpdateObjectAtPropAndValue<RegisterVersionFormData>;
  isFieldDirty: (field: PrefillableRegisterVersionField) => boolean;
};

type UsePrefillRegisterVersionFieldsReturnVal = {
  loadedPrefillData: boolean;
  loadPrefillDataError?: Error;
  latestVersion?: ModelVersion;
  latestArtifact?: ModelArtifact;
};

export const usePrefillRegisterVersionFields = ({
  registeredModel,
  setData,
  isFieldDirty,
}: UsePrefillRegisterVersionFieldsArgs): UsePrefillRegisterVersionFieldsReturnVal => {
  const [allModelVersions, loadedModelVersions, loadModelVersionsError] =
    useModelVersionsByRegisteredModel(registeredModel?.id);
  const liveModelVersions = filterLiveVersions(allModelVersions.items);
  const latestVersion = getLastCreatedItem(liveModelVersions);

  const [modelArtifacts, loadedModelArtifacts, loadModelArtifactsError] =
    useModelArtifactsByVersionId(latestVersion?.id);
  const latestArtifact = getLastCreatedItem(modelArtifacts.items);

  // We don't care about artifact loading state if there is no version
  const isLoadingVersionOrArtifact =
    !!registeredModel && (!loadedModelVersions || (!!latestVersion && !loadedModelArtifacts));
  const errorLoadingVersionOrArtifact = loadModelVersionsError || loadModelArtifactsError;

  // Prefill fields from latest artifact if present. Repeat if selected model changes.
  const prefilledForModelId = React.useRef<string | undefined>();
  React.useEffect(() => {
    if (
      registeredModel &&
      registeredModel.id !== prefilledForModelId.current &&
      !isLoadingVersionOrArtifact
    ) {
      prefilledForModelId.current = registeredModel.id;
      const setIfNotDirty = <K extends PrefillableRegisterVersionField>(
        field: K,
        value: RegisterVersionFormData[K],
      ) => {
        if (!isFieldDirty(field)) {
          setData(field, value);
        }
      };

      if (latestArtifact) {
        setIfNotDirty('sourceModelFormat', latestArtifact.modelFormatName || '');
        setIfNotDirty('sourceModelFormatVersion', latestArtifact.modelFormatVersion || '');

        const decodedUri = (latestArtifact.uri && uriToStorageFields(latestArtifact.uri)) || null;

        setIfNotDirty('modelLocationType', ModelLocationType.ObjectStorage);
        if (decodedUri?.s3Fields) {
          setIfNotDirty('modelLocationEndpoint', decodedUri.s3Fields.endpoint);
          setIfNotDirty('modelLocationBucket', decodedUri.s3Fields.bucket);
          setIfNotDirty('modelLocationRegion', decodedUri.s3Fields.region || '');
          // Don't prefill the path since a new version will have a new path.
        } else {
          // We don't want an old model's location staying here if we changed models but have no location to prefill.
          setIfNotDirty('modelLocationEndpoint', '');
          setIfNotDirty('modelLocationBucket', '');
          setIfNotDirty('modelLocationRegion', '');
        }
      } else {
        setIfNotDirty('sourceModelFormat', '');
        setIfNotDirty('sourceModelFormatVersion', '');
        setIfNotDirty('modelLocationType', ModelLocationType.ObjectStorage);
        setIfNotDirty('modelLocationEndpoint', '');
        setIfNotDirty('modelLocationBucket', '');
        setIfNotDirty('modelLocationRegion', '');
      }
    }
  }, [registeredModel, isLoadingVersionOrArtifact, latestArtifact, setData, isFieldDirty]);

  return {
    loadedPrefillData: !isLoadingVersionOrArtifact,
    loadPrefillDataError: errorLoadingVersionOrArtifact,
    latestVersion,
    latestArtifact,
  };
};
