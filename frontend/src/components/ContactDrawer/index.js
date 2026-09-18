import React, { useState, useContext } from "react";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";

import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Drawer from "@material-ui/core/Drawer";
import Link from "@material-ui/core/Link";
import InputLabel from "@material-ui/core/InputLabel";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";

import { i18n } from "../../translate/i18n";

import ContactModal from "../ContactModal";
import MergeContactModal from "../MergeContactModal";
import ContactDrawerSkeleton from "../ContactDrawerSkeleton";
import MarkdownWrapper from "../MarkdownWrapper";
import TagsSelect from "../TagsSelect";
import QueueSelectTicket from "../QueueSelectTicket";
import {
	Timeline,
	TimelineItem,
	TimelineSeparator,
	TimelineConnector,
	TimelineContent,
	TimelineDot
} from "@material-ui/lab";
import { format, parseISO } from "date-fns";

const drawerWidth = 320;

const useStyles = makeStyles(theme => ({
	drawer: {
		width: drawerWidth,
		flexShrink: 0,
	},
	drawerPaper: {
		width: drawerWidth,
		display: "flex",
		height: "100%",
		borderTop: "1px solid rgba(0, 0, 0, 0.12)",
		borderRight: "1px solid rgba(0, 0, 0, 0.12)",
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		borderTopRightRadius: 4,
		borderBottomRightRadius: 4,
	},
	header: {
		display: "flex",
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		backgroundColor: "#eee",
		alignItems: "center",
		padding: theme.spacing(0, 1),
		minHeight: "73px",
		justifyContent: "flex-start",
	},
	content: {
		display: "flex",
		backgroundColor: "#eee",
		flexDirection: "column",
		padding: "8px 0px 8px 8px",
		height: "100%",
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},

	contactAvatar: {
		margin: 15,
		width: 160,
		height: 160,
	},

	contactHeader: {
		display: "flex",
		padding: 8,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		"& > *": {
			margin: 4,
		},
	},

	contactDetails: {
		marginTop: 8,
		padding: 8,
		display: "flex",
		flexDirection: "column",
	},
	contactExtraInfo: {
		marginTop: 4,
		padding: 6,
	},
	timelineContainer: {
		padding: "0",
		margin: "0",
		"& .MuiTimelineItem-missingOppositeContent:before": {
			display: "none"
		},
		"& .MuiTimelineItem-alignLeft:before": {
			display: "none"
		}
	},
	timelinePaper: {
		marginTop: 8,
		padding: "12px",
		display: "flex",
		flexDirection: "column",
	}
}));

const formatDuration = (startStr, endStr) => {
	const start = new Date(startStr);
	const end = new Date(endStr);
	const diffMs = end - start;
	const diffMins = Math.round(diffMs / 60000);
	if (diffMins < 1) return "menos de 1 min";
	if (diffMins < 60) return `${diffMins} min`;
	const diffHours = Math.floor(diffMins / 60);
	const remMins = diffMins % 60;
	return `${diffHours}h ${remMins}m`;
};

const getTimelineItems = (ticket) => {
	const items = [];
	
	if (ticket?.trackings) {
		ticket.trackings.forEach((t) => {
			items.push({
				type: "tracking",
				id: `tracking-${t.id}`,
				createdAt: t.createdAt,
				finishedAt: t.finishedAt,
				userId: t.userId,
				user: t.user,
			});
		});
	}

	if (ticket?.messages) {
		ticket.messages.forEach((m) => {
			if (m.mediaType === "note") {
				items.push({
					type: "note",
					id: `note-${m.id}`,
					createdAt: m.createdAt,
					body: m.body,
				});
			} else if (m.mediaType === "tag") {
				items.push({
					type: "tag",
					id: `tag-${m.id}`,
					createdAt: m.createdAt,
					body: m.body,
				});
			} else if (m.mediaType === "schedule_history") {
				items.push({
					type: "schedule_history",
					id: `schedule-${m.id}`,
					createdAt: m.createdAt,
					body: m.body,
				});
			}
		});
	}

	return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const ContactDrawer = ({ open, handleDrawerClose, contact, ticket, loading }) => {
	const classes = useStyles();

	const [modalOpen, setModalOpen] = useState(false);
	const [mergeModalOpen, setMergeModalOpen] = useState(false);
	const { user } = useContext(AuthContext);

	return (
		<Drawer
			className={classes.drawer}
			variant="persistent"
			anchor="right"
			open={open}
			PaperProps={{ style: { position: "absolute" } }}
			BackdropProps={{ style: { position: "absolute" } }}
			ModalProps={{
				container: document.getElementById("drawer-container"),
				style: { position: "absolute" },
			}}
			classes={{
				paper: classes.drawerPaper,
			}}
		>
			<div className={classes.header}>
				<IconButton onClick={handleDrawerClose}>
					<CloseIcon />
				</IconButton>
				<Typography style={{ justifySelf: "center" }}>
					{i18n.t("contactDrawer.header")}
				</Typography>
			</div>
			{loading ? (
				<ContactDrawerSkeleton classes={classes} />
			) : (
				<div className={classes.content}>
					<Paper square variant="outlined" className={classes.contactHeader}>
						<Avatar
							alt={contact.name}
							src={contact.profilePicUrl}
							className={classes.contactAvatar}
						></Avatar>

						<Typography>{contact.name}</Typography>
						<Typography>
							<Link href={`tel:${contact.number}`}>{contact.number}</Link>
						</Typography>
						<Button
							variant="outlined"
							color="primary"
							onClick={() => setModalOpen(true)}
						>
							{i18n.t("contactDrawer.buttons.edit")}
						</Button>
						{user.profile === "admin" && (
							<Button
								variant="outlined"
								color="secondary"
								onClick={() => setMergeModalOpen(true)}
								style={{ marginTop: 8 }}
							>
								Unificar Contacto
							</Button>
						)}
					</Paper>
					<Paper square variant="outlined" className={classes.contactDetails}>
						<ContactModal
							open={modalOpen}
							onClose={() => setModalOpen(false)}
							contactId={contact.id}
						></ContactModal>
						<MergeContactModal
							open={mergeModalOpen}
							onClose={() => setMergeModalOpen(false)}
							sourceContact={contact}
						></MergeContactModal>
						{ticket && (
							<>
								<Typography variant="subtitle1">
									Departamento / Cola
								</Typography>
								<QueueSelectTicket ticket={ticket} />
							</>
						)}
						<Typography variant="subtitle1" style={{ marginTop: 10 }}>
							Etiquetas
						</Typography>
						<TagsSelect ticket={ticket} />
						<Typography variant="subtitle1" style={{marginTop: 10}}>
							{i18n.t("contactDrawer.extraInfo")}
						</Typography>
						{contact?.extraInfo?.map(info => (
							<Paper
								key={info.id}
								square
								variant="outlined"
								className={classes.contactExtraInfo}
							>
								<InputLabel>{info.name}</InputLabel>
								<Typography component="div" noWrap style={{ paddingTop: 2 }}>
									<MarkdownWrapper>{info.value}</MarkdownWrapper>
								</Typography>
							</Paper>
						))}
					</Paper>
					<Paper square variant="outlined" className={classes.timelinePaper}>
						<Typography variant="subtitle1" style={{ marginBottom: 10, fontWeight: "bold" }}>
							Historial de Proceso
						</Typography>
						{(() => {
							const timelineItems = getTimelineItems(ticket);
							if (timelineItems.length === 0) {
								return (
									<Typography variant="body2" color="textSecondary" style={{ fontStyle: "italic", fontSize: "12px" }}>
										No hay historial registrado.
									</Typography>
								);
							}

							return (
								<Timeline align="left" className={classes.timelineContainer}>
									{timelineItems.map((item, idx) => {
										const isLast = idx === timelineItems.length - 1;
										const dateFormatted = format(parseISO(item.createdAt), "dd/MM/yyyy HH:mm");
										
										let contentText = "";
										let dotBgColor = "#9e9e9e"; // grey
										
										if (item.type === "note") {
											contentText = `Nota: "${item.body}"`;
											dotBgColor = "#fbc02d"; // yellow
										} else if (item.type === "tag") {
											contentText = item.body; // e.g. "Etiqueta agregada: 'Negociación'"
											dotBgColor = "#9c27b0"; // purple
										} else if (item.type === "schedule_history") {
											contentText = item.body;
											dotBgColor = "#607d8b"; // grey-blue
										} else {
											if (idx === 0) {
												contentText = "Inicio conversación";
												dotBgColor = "#e91e63"; // pink/pink-red
											} else if (!item.userId) {
												contentText = "Devuelto a pendientes";
												dotBgColor = "#ff9800"; // orange
											} else {
												contentText = `Asignado a: ${item.user?.name || "Desconocido"}`;
												dotBgColor = "#2196f3"; // blue
											}

											if (item.finishedAt) {
												const durationText = formatDuration(item.createdAt, item.finishedAt);
												contentText += ` (${durationText})`;
											} else {
												contentText += " (Activo)";
												dotBgColor = "#4caf50"; // green
											}
										}

										return (
											<TimelineItem key={item.id} style={{ minHeight: "50px", padding: 0 }}>
												<TimelineSeparator style={{ marginRight: 8 }}>
													<TimelineDot style={{ backgroundColor: dotBgColor, padding: 4, margin: "6px 0" }} />
													{!isLast && <TimelineConnector />}
												</TimelineSeparator>
												<TimelineContent style={{ padding: "4px 0", fontSize: "12px" }}>
													<Typography variant="body2" style={{ fontSize: "12px", fontWeight: "500" }}>
														{contentText}
													</Typography>
													<Typography variant="caption" color="textSecondary" style={{ fontSize: "10px" }}>
														{dateFormatted}
													</Typography>
												</TimelineContent>
											</TimelineItem>
										);
									})}
								</Timeline>
							);
						})()}
					</Paper>
				</div>
			)}
		</Drawer>
	);
};

export default ContactDrawer;
