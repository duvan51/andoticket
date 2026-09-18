import React, { useContext, useEffect, useRef, useState } from "react";

import MenuItem from "@material-ui/core/MenuItem";
import Menu from "@material-ui/core/Menu";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ConfirmationModal from "../ConfirmationModal";
import TransferTicketModal from "../TransferTicketModal";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { Can } from "../Can";
import { AuthContext } from "../../context/Auth/AuthContext";

const TicketOptionsMenu = ({ ticket, menuOpen, handleClose, anchorEl }) => {
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const [cleanConfirmationOpen, setCleanConfirmationOpen] = useState(false);
	const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	const handleDeleteTicket = async () => {
		try {
			await api.delete(`/tickets/${ticket.id}`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleCleanTicket = async () => {
		try {
			await api.delete(`/tickets/${ticket.id}/clean`);
		} catch (err) {
			toastError(err);
		}
	};

	const handleResetFlow = async () => {
		try {
			await api.post(`/tickets/${ticket.id}/reset-flow`);
			toast.success(i18n.t("messagesList.header.buttons.resetFlowSuccess"));
			handleClose();
		} catch (err) {
			toastError(err);
		}
	};

	const handleExitFlow = async () => {
		try {
			await api.post(`/tickets/${ticket.id}/exit-flow`);
			toast.success(i18n.t("messagesList.header.buttons.exitFlowSuccess"));
			handleClose();
		} catch (err) {
			toastError(err);
		}
	};

	const handleOpenConfirmationModal = e => {
		setConfirmationOpen(true);
		handleClose();
	};

	const handleOpenCleanConfirmationModal = e => {
		setCleanConfirmationOpen(true);
		handleClose();
	};

	const handleOpenTransferModal = e => {
		setTransferTicketModalOpen(true);
		handleClose();
	};

	const handleCloseTransferTicketModal = () => {
		if (isMounted.current) {
			setTransferTicketModalOpen(false);
		}
	};

	return (
		<>
			<Menu
				id="menu-appbar"
				anchorEl={anchorEl}
				getContentAnchorEl={null}
				anchorOrigin={{
					vertical: "bottom",
					horizontal: "right",
				}}
				keepMounted
				transformOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				open={menuOpen}
				onClose={handleClose}
			>
				<MenuItem onClick={handleResetFlow}>
					{i18n.t("messagesList.header.buttons.resetFlow")}
				</MenuItem>
				{!ticket.flowStopped && (
					<MenuItem onClick={handleExitFlow}>
						{i18n.t("messagesList.header.buttons.exitFlow")}
					</MenuItem>
				)}
				<MenuItem onClick={handleOpenTransferModal}>
					{i18n.t("ticketOptionsMenu.transfer")}
				</MenuItem>
				{ticket.isGroup && (
					<MenuItem onClick={handleOpenCleanConfirmationModal}>
						{i18n.t("ticketOptionsMenu.clean")}
					</MenuItem>
				)}
				<Can
					role={user.profile}
					perform="ticket-options:deleteTicket"
					yes={() => (
						<MenuItem onClick={handleOpenConfirmationModal}>
							{i18n.t("ticketOptionsMenu.delete")}
						</MenuItem>
					)}
				/>
			</Menu>
			<ConfirmationModal
				title={`${i18n.t("ticketOptionsMenu.confirmationModal.title")}${
					ticket.id
				} ${i18n.t("ticketOptionsMenu.confirmationModal.titleFrom")} ${
					ticket.contact.name
				}?`}
				open={confirmationOpen}
				onClose={setConfirmationOpen}
				onConfirm={handleDeleteTicket}
			>
				{i18n.t("ticketOptionsMenu.confirmationModal.message")}
			</ConfirmationModal>
			<ConfirmationModal
				title={`${i18n.t("ticketOptionsMenu.cleanConfirmationModal.title")}${
					ticket.id
				} ${i18n.t("ticketOptionsMenu.cleanConfirmationModal.titleFrom")}${
					ticket.contact.name
				}?`}
				open={cleanConfirmationOpen}
				onClose={setCleanConfirmationOpen}
				onConfirm={handleCleanTicket}
			>
				{i18n.t("ticketOptionsMenu.cleanConfirmationModal.message")}
			</ConfirmationModal>
			<TransferTicketModal
				modalOpen={transferTicketModalOpen}
				onClose={handleCloseTransferTicketModal}
				ticketid={ticket.id}
				ticketWhatsappId={ticket.whatsappId}
			/>
		</>
	);
};

export default TicketOptionsMenu;
