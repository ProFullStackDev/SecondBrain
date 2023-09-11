/* eslint-disable max-lines */
import axios, { AxiosResponse } from "axios";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Subscription } from "@/lib/api/brain/brain";
import { useBrainApi } from "@/lib/api/brain/useBrainApi";
import { useToast } from "@/lib/hooks";

import {
  BrainRoleAssignation,
  BrainRoleType,
} from "../components/NavBar/components/NavItems/components/BrainsDropDown/components/BrainActions/types";
import { generateBrainAssignation } from "../components/ShareBrain/utils/generateBrainAssignation";
import { useBrainContext } from "../context/BrainProvider/hooks/useBrainContext";

const requiredAccessToShareBrain: BrainRoleType[] = ["Owner", "Editor"];

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useShareBrain = (brainId: string, userId: string) => {
  const [sendingInvitation, setSendingInvitation] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [roleAssignations, setRoleAssignation] = useState<
    BrainRoleAssignation[]
  >([generateBrainAssignation()]);
  const { t } = useTranslation(["brain"]);

  const { publish } = useToast();
  const { addBrainSubscriptions } = useBrainApi();

  const { allBrains, currentBrain } = useBrainContext();
  
  const baseUrl = window.location.origin;
  // const brainShareLink = `${baseUrl}/invitation/${brainId}`;
  const brainShareLink = `${baseUrl}/share-brain?brainId=${brainId}&userId=${userId}&brainName=${currentBrain?.name ?? "this"}`;
  const hasShareBrainRights = requiredAccessToShareBrain.includes(
    allBrains.find((brain) => brain.id === brainId)?.role ?? "Viewer"
  );

  const handleCopyInvitationLink = async () => {
    await navigator.clipboard.writeText(brainShareLink);
    publish({
      variant: "success",
      text: t("copiedToClipboard", { ns: "brain" }),
    });
  };

  const removeRoleAssignation = (assignationIndex: number) => () => {
    if (roleAssignations.length === 1) {
      return;
    }
    setRoleAssignation(
      roleAssignations.filter((_, index) => index !== assignationIndex)
    );
  };

  const updateRoleAssignation =
    (rowIndex: number) => (data: BrainRoleAssignation) => {
      const concernedRow = roleAssignations[rowIndex];

      if (concernedRow !== undefined) {
        setRoleAssignation(
          roleAssignations.map((row, index) => {
            if (index === rowIndex) {
              return data;
            }

            return row;
          })
        );
      } else {
        setRoleAssignation([...roleAssignations, data]);
      }
    };

  const inviteUsers = async (): Promise<void> => {
    setSendingInvitation(true);
    try {
      const inviteUsersPayload: Subscription[] = roleAssignations
        .filter(({ email }) => email !== "")
        .map((assignation) => ({
          email: assignation.email,
          role: assignation.role,
        }));

      await addBrainSubscriptions(brainId, inviteUsersPayload);

      publish({
        variant: "success",
        text: t("usersInvited", { ns: "brain" }),
      });

      setIsShareModalOpen(false);
      setRoleAssignation([generateBrainAssignation()]);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data !== undefined) {
        publish({
          variant: "danger",
          text: (
            error.response as AxiosResponse<{
              detail: string;
            }>
          ).data.detail,
        });
      } else {
        publish({
          variant: "danger",
          text: t("errorSendingInvitation"),
        });
      }
    } finally {
      setSendingInvitation(false);
    }
  };

  const addNewRoleAssignationRole = () => {
    setRoleAssignation([...roleAssignations, generateBrainAssignation()]);
  };
  const canAddNewRow =
    roleAssignations.length === 0 ||
    roleAssignations.filter((invitingUser) => invitingUser.email === "")
      .length === 0;

  return {
    roleAssignations,
    brainShareLink,
    handleCopyInvitationLink,
    updateRoleAssignation,
    removeRoleAssignation,
    inviteUsers,
    addNewRoleAssignationRole,
    sendingInvitation,
    setIsShareModalOpen,
    isShareModalOpen,
    canAddNewRow,
    hasShareBrainRights,
  };
};
