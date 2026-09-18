import React, { useState, useContext } from "react";

import MenuItem from "@material-ui/core/MenuItem";
import { Menu } from "@material-ui/core";
import ReplyIcon from "@material-ui/icons/Reply";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ConfirmationModal from "../ConfirmationModal";
import ForwardMessageModal from "../ForwardMessageModal";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import toastError from "../../errors/toastError";

const MessageOptionsMenu = ({ message, menuOpen, handleClose, anchorEl }) => {
  const { setReplyingMessage } = useContext(ReplyMessageContext);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);

  const handleDeleteMessage = async () => {
    try {
      await api.delete(`/messages/${message.id}`);
    } catch (err) {
      toastError(err);
    }
  };

  const hanldeReplyMessage = () => {
    setReplyingMessage(message);
    handleClose();
  };

  const handleOpenConfirmationModal = (e) => {
    setConfirmationOpen(true);
    handleClose();
  };

  const handleOpenForwardModal = () => {
    setForwardModalOpen(true);
    handleClose();
  };

  return (
    <>
      <ConfirmationModal
        title={i18n.t("messageOptionsMenu.confirmationModal.title")}
        open={confirmationOpen}
        onClose={setConfirmationOpen}
        onConfirm={handleDeleteMessage}
      >
        {i18n.t("messageOptionsMenu.confirmationModal.message")}
      </ConfirmationModal>

      <ForwardMessageModal
        open={forwardModalOpen}
        onClose={() => setForwardModalOpen(false)}
        message={message}
      />

      <Menu
        anchorEl={anchorEl}
        getContentAnchorEl={null}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        open={menuOpen}
        onClose={handleClose}
      >
        {message.fromMe && (
          <MenuItem onClick={handleOpenConfirmationModal}>
            <DeleteOutlineIcon style={{ marginRight: 8, fontSize: 18 }} />
            {i18n.t("messageOptionsMenu.delete")}
          </MenuItem>
        )}
        <MenuItem onClick={hanldeReplyMessage}>
          <ReplyIcon style={{ marginRight: 8, fontSize: 18 }} />
          {i18n.t("messageOptionsMenu.reply")}
        </MenuItem>
        <MenuItem onClick={handleOpenForwardModal}>
          <ReplyIcon style={{ transform: "scaleX(-1)", marginRight: 8, fontSize: 18 }} />
          {i18n.t("messageOptionsMenu.forward")}
        </MenuItem>
      </Menu>
    </>
  );
};

export default MessageOptionsMenu;
