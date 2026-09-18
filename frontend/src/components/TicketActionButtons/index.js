import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import { IconButton, Tooltip, useMediaQuery, Chip } from "@material-ui/core";
import { MoreVert, Replay, Done, RotateLeft, Block } from "@material-ui/icons";
import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import TicketOptionsMenu from "../TicketOptionsMenu";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
	actionButtons: {
		marginRight: 6,
		flex: "none",
		alignSelf: "center",
		marginLeft: "auto",
		display: "flex",
		alignItems: "center",
		"& > *": {
			margin: theme.spacing(0.5),
		},
	},
}));

const TicketActionButtons = ({ ticket }) => {
	const classes = useStyles();
	const history = useHistory();
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));
	const [anchorEl, setAnchorEl] = useState(null);
	const [loading, setLoading] = useState(false);
	const [loadingReset, setLoadingReset] = useState(false);
	const [loadingExit, setLoadingExit] = useState(false);
	const ticketOptionsMenuOpen = Boolean(anchorEl);
	const { user } = useContext(AuthContext);

	const handleOpenTicketOptionsMenu = e => {
		setAnchorEl(e.currentTarget);
	};

	const handleCloseTicketOptionsMenu = e => {
		setAnchorEl(null);
	};

	const handleUpdateTicketStatus = async (e, status, userId) => {
		setLoading(true);
		try {
			await api.put(`/tickets/${ticket.id}`, {
				status: status,
				userId: userId || null,
			});

			setLoading(false);
			if (status === "open") {
				history.push(`/tickets/${ticket.id}`);
			} else {
				history.push("/tickets");
			}
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
	};

	const handleResetFlow = async () => {
		setLoadingReset(true);
		try {
			await api.post(`/tickets/${ticket.id}/reset-flow`);
			toast.success(i18n.t("messagesList.header.buttons.resetFlowSuccess"));
			history.push("/tickets");
		} catch (err) {
			toastError(err);
		} finally {
			setLoadingReset(false);
		}
	};

	const handleExitFlow = async () => {
		setLoadingExit(true);
		try {
			await api.post(`/tickets/${ticket.id}/exit-flow`);
			toast.success(i18n.t("messagesList.header.buttons.exitFlowSuccess"));
		} catch (err) {
			toastError(err);
		} finally {
			setLoadingExit(false);
		}
	};

	return (
		<div className={classes.actionButtons}>
			{ticket.status === "closed" && (
				<>
					<Tooltip title={i18n.t("messagesList.header.buttons.reopen")}>
						<span>
							<ButtonWithSpinner
								loading={loading}
								startIcon={<Replay />}
								size="small"
								variant="contained"
								color="primary"
								onClick={e => handleUpdateTicketStatus(e, "open", user?.id)}
							>
								{isMobile ? "" : i18n.t("messagesList.header.buttons.reopen")}
							</ButtonWithSpinner>
						</span>
					</Tooltip>
					<Tooltip title={i18n.t("messagesList.header.buttons.resetFlow")}>
						<span>
							<ButtonWithSpinner
								loading={loadingReset}
								startIcon={<RotateLeft />}
								size="small"
								variant="outlined"
								color="primary"
								onClick={handleResetFlow}
							>
								{isMobile ? "" : i18n.t("messagesList.header.buttons.resetFlow")}
							</ButtonWithSpinner>
						</span>
					</Tooltip>
				</>
			)}
			{ticket.status === "open" && (
				<>
					{!ticket.flowStopped ? (
						<Tooltip title={i18n.t("messagesList.header.buttons.exitFlow")}>
							<span>
								<ButtonWithSpinner
									loading={loadingExit}
									startIcon={<Block />}
									size="small"
									variant="outlined"
									color="secondary"
									onClick={handleExitFlow}
								>
									{isMobile ? "" : i18n.t("messagesList.header.buttons.exitFlow")}
								</ButtonWithSpinner>
							</span>
						</Tooltip>
					) : (
						<Chip
							label={i18n.t("messagesList.header.buttons.flowStopped")}
							size="small"
							color="secondary"
							variant="outlined"
							style={{ marginRight: 4, height: 26 }}
						/>
					)}
					<Tooltip title={i18n.t("messagesList.header.buttons.resetFlow")}>
						<span>
							<ButtonWithSpinner
								loading={loadingReset}
								startIcon={<RotateLeft />}
								size="small"
								variant="outlined"
								color="primary"
								onClick={handleResetFlow}
							>
								{isMobile ? "" : i18n.t("messagesList.header.buttons.resetFlow")}
							</ButtonWithSpinner>
						</span>
					</Tooltip>
					<Tooltip title={i18n.t("messagesList.header.buttons.return")}>
						<span>
							<ButtonWithSpinner
								loading={loading}
								startIcon={<Replay />}
								size="small"
								variant="outlined"
								color="primary"
								onClick={e => handleUpdateTicketStatus(e, "pending", null)}
							>
								{i18n.t("messagesList.header.buttons.return")}
							</ButtonWithSpinner>
						</span>
					</Tooltip>
					<Tooltip title={i18n.t("messagesList.header.buttons.resolve")}>
						<span>
							<ButtonWithSpinner
								loading={loading}
								startIcon={isMobile ? <Done /> : undefined}
								size="small"
								variant="contained"
								color="primary"
								onClick={e => handleUpdateTicketStatus(e, "closed", user?.id)}
							>
								{isMobile ? "" : i18n.t("messagesList.header.buttons.resolve")}
							</ButtonWithSpinner>
						</span>
					</Tooltip>
					<IconButton onClick={handleOpenTicketOptionsMenu}>
						<MoreVert />
					</IconButton>
					<TicketOptionsMenu
						ticket={ticket}
						anchorEl={anchorEl}
						menuOpen={ticketOptionsMenuOpen}
						handleClose={handleCloseTicketOptionsMenu}
					/>
				</>
			)}
			{ticket.status === "pending" && (
				<>
					<Tooltip title={i18n.t("messagesList.header.buttons.accept")}>
						<span>
							<ButtonWithSpinner
								loading={loading}
								startIcon={isMobile ? <Done /> : undefined}
								size="small"
								variant="contained"
								color="primary"
								onClick={e => handleUpdateTicketStatus(e, "open", user?.id)}
							>
								{isMobile ? "" : i18n.t("messagesList.header.buttons.accept")}
							</ButtonWithSpinner>
						</span>
					</Tooltip>
					{!ticket.flowStopped ? (
						<Tooltip title={i18n.t("messagesList.header.buttons.exitFlow")}>
							<span>
								<ButtonWithSpinner
									loading={loadingExit}
									startIcon={<Block />}
									size="small"
									variant="outlined"
									color="secondary"
									onClick={handleExitFlow}
								>
									{isMobile ? "" : i18n.t("messagesList.header.buttons.exitFlow")}
								</ButtonWithSpinner>
							</span>
						</Tooltip>
					) : (
						<Chip
							label={i18n.t("messagesList.header.buttons.flowStopped")}
							size="small"
							color="secondary"
							variant="outlined"
							style={{ marginRight: 4, height: 26 }}
						/>
					)}
					<Tooltip title={i18n.t("messagesList.header.buttons.resetFlow")}>
						<span>
							<ButtonWithSpinner
								loading={loadingReset}
								startIcon={<RotateLeft />}
								size="small"
								variant="outlined"
								color="primary"
								onClick={handleResetFlow}
							>
								{isMobile ? "" : i18n.t("messagesList.header.buttons.resetFlow")}
							</ButtonWithSpinner>
						</span>
					</Tooltip>
					<IconButton onClick={handleOpenTicketOptionsMenu}>
						<MoreVert />
					</IconButton>
					<TicketOptionsMenu
						ticket={ticket}
						anchorEl={anchorEl}
						menuOpen={ticketOptionsMenuOpen}
						handleClose={handleCloseTicketOptionsMenu}
					/>
				</>
			)}
		</div>
	);
};

export default TicketActionButtons;
