import React, { useState, useEffect, useRef, useContext } from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import Divider from "@material-ui/core/Divider";
import Badge from "@material-ui/core/Badge";
import Checkbox from "@material-ui/core/Checkbox";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";
import { Tooltip } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
	ticket: {
		position: "relative",
		paddingTop: 8,
		paddingBottom: 8,
	},

	pendingTicket: {
		cursor: "unset",
	},

	noTicketsDiv: {
		display: "flex",
		height: "100px",
		margin: 40,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
	},

	noTicketsText: {
		textAlign: "center",
		color: "rgb(104, 121, 146)",
		fontSize: "14px",
		lineHeight: "1.4",
	},

	noTicketsTitle: {
		textAlign: "center",
		fontSize: "16px",
		fontWeight: "600",
		margin: "0px",
	},

	contactNameWrapper: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
	},

	lastMessageTime: {
		fontSize: "0.8rem",
		color: theme.palette.text.secondary,
	},

	closedBadge: {
		alignSelf: "center",
		justifySelf: "flex-end",
		marginRight: 32,
		marginLeft: "auto",
	},

	contactLastMessage: {
		paddingRight: 10,
		flex: 1,
		fontSize: "0.9rem",
		color: theme.palette.text.secondary,
	},

	newMessagesCount: {
		alignSelf: "center",
		marginLeft: "auto",
	},

	badgeStyle: {
		color: "white",
		backgroundColor: green[500],
		right: 0,
		top: 5,
	},

	acceptButton: {
		width: 40,
		height: 40,
		minWidth: 40,
		borderRadius: "50%",
		padding: 0,
		fontSize: "0.6rem",
		marginRight: 12,
	},

	ticketQueueColor: {
		flex: "none",
		width: "4px",
		height: "100%",
		position: "absolute",
		top: "0%",
		left: "0%",
	},

	userTag: {
		background: theme.palette.primary.main,
		color: "#ffffff",
		padding: "1px 6px",
		borderRadius: 4,
		fontSize: "0.7rem",
		marginLeft: 8,
		whiteSpace: "nowrap",
		fontWeight: "bold",
		overflow: "hidden",
		textOverflow: "ellipsis",
		maxWidth: 100,
	},

	secondaryWrapper: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
		marginTop: 4,
	},

	avatarRight: {
		marginLeft: 12,
		marginRight: 0,
	},
}));

const TicketListItem = ({ ticket, selectedTickets = [], onSelectTicket, selectionMode }) => {
	const classes = useStyles();
	const history = useHistory();
	const [loading, setLoading] = useState(false);
	const { ticketId } = useParams();
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	const handleAcepptTicket = async id => {
		setLoading(true);
		try {
			await api.put(`/tickets/${id}`, {
				status: "open",
				userId: user?.id,
			});
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
		if (isMounted.current) {
			setLoading(false);
		}
		history.push(`/tickets/${id}`);
	};

	const handleSelectTicket = id => {
		history.push(`/tickets/${id}`);
	};

	return (
		<React.Fragment key={ticket.id}>
			<ListItem
				dense
				button
				onClick={e => {
					if (selectionMode) {
						onSelectTicket(ticket.id);
					} else {
						handleSelectTicket(ticket.id);
					}
				}}
				selected={selectionMode ? selectedTickets.includes(ticket.id) : (ticketId && +ticketId === ticket.id)}
				className={clsx(classes.ticket, {
					[classes.pendingTicket]: ticket.status === "pending",
				})}
			>
				<Tooltip
					arrow
					placement="right"
					title={ticket.queue?.name || "Sem fila"}
				>
					<span
						style={{ backgroundColor: ticket.queue?.color || "#7C7C7C" }}
						className={classes.ticketQueueColor}
					></span>
				</Tooltip>
				{selectionMode && (
					<Checkbox
						color="primary"
						checked={selectedTickets.includes(ticket.id)}
						onChange={() => onSelectTicket(ticket.id)}
						onClick={(e) => e.stopPropagation()}
						style={{ marginRight: 8, padding: 0 }}
					/>
				)}
				{ticket.status === "pending" && !selectionMode && (
					<ButtonWithSpinner
						color="primary"
						variant="contained"
						className={classes.acceptButton}
						size="small"
						loading={loading}
						onClick={e => handleAcepptTicket(ticket.id)}
					>
						{i18n.t("ticketsList.buttons.accept")}
					</ButtonWithSpinner>
				)}
				<ListItemText
					disableTypography
					primary={
						<div className={classes.contactNameWrapper}>
							<Typography
								noWrap
								component="span"
								variant="subtitle2"
								color="textPrimary"
								style={{ fontWeight: "bold", fontSize: "1rem" }}
							>
								{ticket.contact.name}
							</Typography>
							<div style={{ display: "flex", alignItems: "center" }}>
								{ticket.status === "closed" && (
									<Badge
										className={classes.closedBadge}
										badgeContent={"closed"}
										color="primary"
										overlap="rectangular"
									/>
								)}
								{ticket.lastMessage && (
									<Typography
										className={classes.lastMessageTime}
										component="span"
									>
										{isSameDay(parseISO(ticket.updatedAt), new Date()) ? (
											<>{format(parseISO(ticket.updatedAt), "HH:mm")}</>
										) : (
											<>{format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}</>
										)}
									</Typography>
								)}
							</div>
						</div>
					}
					secondary={
						<div className={classes.secondaryWrapper}>
							<Typography
								className={classes.contactLastMessage}
								noWrap
								component="span"
								variant="body2"
							>
								{ticket.lastMessage ? (
									<MarkdownWrapper>{ticket.lastMessage}</MarkdownWrapper>
								) : (
									<br />
								)}
							</Typography>

							<div style={{ display: "flex", alignItems: "center" }}>
								{ticket.whatsappId && (
									<div className={classes.userTag} title={i18n.t("ticketsList.connectionTitle")}>
										{ticket.whatsapp?.name}
									</div>
								)}
								{ticket.unreadMessages > 0 && (
									<Badge
										className={classes.newMessagesCount}
										badgeContent={ticket.unreadMessages}
										classes={{
											badge: classes.badgeStyle,
										}}
										overlap="rectangular"
									/>
								)}
							</div>
						</div>
					}
				/>
				<ListItemAvatar className={classes.avatarRight}>
					<Avatar src={ticket?.contact?.profilePicUrl} />
				</ListItemAvatar>
			</ListItem>
			<Divider variant="inset" component="li" />
		</React.Fragment>
	);
};

export default TicketListItem;
