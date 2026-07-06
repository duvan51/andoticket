import React, { useState, useEffect, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import ColorPicker from "../ColorPicker";
import { IconButton, InputAdornment } from "@material-ui/core";
import { Colorize } from "@material-ui/icons";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},
	textField: {
		marginRight: theme.spacing(1),
		flex: 1,
	},

	btnWrapper: {
		position: "relative",
	},

	buttonProgress: {
		color: green[500],
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
	},
	formControl: {
		margin: theme.spacing(1),
		minWidth: 120,
	},
	colorAdorment: {
		width: 20,
		height: 20,
	},
}));

const QueueOptionNode = ({ option, allOptions, onAdd, onEdit, onDelete }) => {
	const [showChildren, setShowChildren] = useState(true);
	const children = allOptions ? allOptions.filter(o => o.parentId === option.id) : [];

	return (
		<div style={{ marginLeft: 20, marginTop: 10, borderLeft: "1px dashed #ccc", paddingLeft: 15 }}>
			<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
				<div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
					<span style={{ fontWeight: "bold", color: "#3f51b5" }}>
						[{option.option}] {option.title}
					</span>
					<div style={{ display: "flex", gap: 5 }}>
						<Button size="small" style={{ fontSize: 11 }} variant="text" color="primary" onClick={() => onAdd(option.id)}>
							+ Sub-opción
						</Button>
						<Button size="small" style={{ fontSize: 11 }} variant="text" onClick={() => onEdit(option)}>
							Editar
						</Button>
						<Button size="small" style={{ fontSize: 11 }} variant="text" color="secondary" onClick={() => onDelete(option.id)}>
							Eliminar
						</Button>
					</div>
				</div>
				{option.message && (
					<Typography variant="caption" color="textSecondary" style={{ fontStyle: "italic", marginLeft: 10 }}>
						Envía: {option.message}
					</Typography>
				)}
			</div>
			{showChildren && children.map(child => (
				<QueueOptionNode
					key={child.id}
					option={child}
					allOptions={allOptions}
					onAdd={onAdd}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			))}
		</div>
	);
};

const QueueSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Too Short!")
		.max(50, "Too Long!")
		.required("Required"),
	color: Yup.string().min(3, "Too Short!").max(9, "Too Long!").required(),
	greetingMessage: Yup.string(),
});

const QueueModal = ({ open, onClose, queueId }) => {
	const classes = useStyles();

	const initialState = {
		name: "",
		color: "",
		greetingMessage: "",
	};

	const [colorPickerModalOpen, setColorPickerModalOpen] = useState(false);
	const [queue, setQueue] = useState(initialState);
	const greetingRef = useRef();

	const [activeOption, setActiveOption] = useState(null);
	const [mode, setMode] = useState("");

	const handleSaveOption = async () => {
		if (!activeOption.option || !activeOption.title) {
			toast.error("Por favor completa los campos obligatorios.");
			return;
		}

		try {
			if (mode === "add") {
				const { data } = await api.post("/queue-options", activeOption);
				setQueue(prevState => {
					const options = prevState.options ? [...prevState.options, data] : [data];
					return { ...prevState, options };
				});
				toast.success("Opción agregada con éxito.");
			} else {
				const { data } = await api.put(`/queue-options/${activeOption.id}`, activeOption);
				setQueue(prevState => {
					const options = prevState.options.map(o => o.id === data.id ? data : o);
					return { ...prevState, options };
				});
				toast.success("Opción actualizada con éxito.");
			}
			setActiveOption(null);
		} catch (err) {
			toastError(err);
		}
	};

	const handleDeleteOption = async (optionId) => {
		try {
			await api.delete(`/queue-options/${optionId}`);
			setQueue(prevState => {
				const getDescendants = (id, list) => {
					const children = list.filter(o => o.parentId === id);
					return children.reduce((acc, c) => [...acc, c.id, ...getDescendants(c.id, list)], []);
				};
				const descendants = getDescendants(optionId, prevState.options || []);
				const options = (prevState.options || []).filter(o => o.id !== optionId && !descendants.includes(o.id));
				return { ...prevState, options };
			});
			toast.success("Opción eliminada con éxito.");
		} catch (err) {
			toastError(err);
		}
	};

	useEffect(() => {
		(async () => {
			if (!queueId) return;
			try {
				const { data } = await api.get(`/queue/${queueId}`);
				setQueue(prevState => {
					return { ...prevState, ...data };
				});
			} catch (err) {
				toastError(err);
			}
		})();

		return () => {
			setQueue({
				name: "",
				color: "",
				greetingMessage: "",
			});
		};
	}, [queueId, open]);

	const handleClose = () => {
		onClose();
		setQueue(initialState);
	};

	const handleSaveQueue = async values => {
		try {
			if (queueId) {
				await api.put(`/queue/${queueId}`, values);
			} else {
				await api.post("/queue", values);
			}
			toast.success("Queue saved successfully");
			handleClose();
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<div className={classes.root}>
			<Dialog open={open} onClose={handleClose} scroll="paper">
				<DialogTitle>
					{queueId
						? `${i18n.t("queueModal.title.edit")}`
						: `${i18n.t("queueModal.title.add")}`}
				</DialogTitle>
				<Formik
					initialValues={queue}
					enableReinitialize={true}
					validationSchema={QueueSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveQueue(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ touched, errors, isSubmitting, values }) => (
						<Form>
							<DialogContent dividers>
								<Field
									as={TextField}
									label={i18n.t("queueModal.form.name")}
									autoFocus
									name="name"
									error={touched.name && Boolean(errors.name)}
									helperText={touched.name && errors.name}
									variant="outlined"
									margin="dense"
									className={classes.textField}
								/>
								<Field
									as={TextField}
									label={i18n.t("queueModal.form.color")}
									name="color"
									id="color"
									onFocus={() => {
										setColorPickerModalOpen(true);
										greetingRef.current.focus();
									}}
									error={touched.color && Boolean(errors.color)}
									helperText={touched.color && errors.color}
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<div
													style={{ backgroundColor: values.color }}
													className={classes.colorAdorment}
												></div>
											</InputAdornment>
										),
										endAdornment: (
											<IconButton
												size="small"
												color="default"
												onClick={() => setColorPickerModalOpen(true)}
											>
												<Colorize />
											</IconButton>
										),
									}}
									variant="outlined"
									margin="dense"
								/>
								<ColorPicker
									open={colorPickerModalOpen}
									handleClose={() => setColorPickerModalOpen(false)}
									onChange={color => {
										values.color = color;
										setQueue(() => {
											return { ...values, color };
										});
									}}
								/>
								<div>
									<Field
										as={TextField}
										label={i18n.t("queueModal.form.greetingMessage")}
										type="greetingMessage"
										multiline
										inputRef={greetingRef}
										rows={5}
										fullWidth
										name="greetingMessage"
										error={
											touched.greetingMessage && Boolean(errors.greetingMessage)
										}
										helperText={
											touched.greetingMessage && errors.greetingMessage
										}
										variant="outlined"
										margin="dense"
									/>
								</div>
								
								{queueId && (
									<div style={{ marginTop: 20 }}>
										<Typography variant="subtitle1" style={{ fontWeight: "bold" }}>
											Flujo de Opciones (Chatbot)
										</Typography>
										<Typography variant="caption" color="textSecondary" style={{ display: "block", marginBottom: 10 }}>
											Configura las opciones numeradas que el cliente puede marcar para este departamento.
										</Typography>
										
										<div>
											<Button
												size="small"
												variant="outlined"
												color="primary"
												onClick={() => {
													setActiveOption({ queueId, parentId: null, option: "", title: "", message: "" });
													setMode("add");
												}}
											>
												+ Agregar Opción Raíz
											</Button>
										</div>

										{activeOption && (
											<Paper style={{ padding: 15, marginTop: 15, backgroundColor: "#f9f9f9" }} variant="outlined">
												<Typography variant="subtitle2" style={{ marginBottom: 10, fontWeight: "bold" }}>
													{mode === "add" ? "Agregar Nueva Opción" : "Editar Opción"}
												</Typography>
												<Grid container spacing={2}>
													<Grid item xs={12} sm={4}>
														<TextField
															label="Disparador (Ej: 1)"
															variant="outlined"
															margin="dense"
															fullWidth
															value={activeOption.option}
															onChange={(e) => setActiveOption({ ...activeOption, option: e.target.value })}
														/>
													</Grid>
													<Grid item xs={12} sm={8}>
														<TextField
															label="Título (Ej: Ver Web)"
															variant="outlined"
															margin="dense"
															fullWidth
															value={activeOption.title}
															onChange={(e) => setActiveOption({ ...activeOption, title: e.target.value })}
														/>
													</Grid>
													<Grid item xs={12}>
														<TextField
															label="Mensaje automatizado a enviar"
															variant="outlined"
															margin="dense"
															multiline
															rows={3}
															fullWidth
															value={activeOption.message}
															onChange={(e) => setActiveOption({ ...activeOption, message: e.target.value })}
														/>
													</Grid>
													<Grid item xs={12} style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
														<Button
															size="small"
															variant="outlined"
															onClick={() => setActiveOption(null)}
														>
															Cancelar
														</Button>
														<Button
															size="small"
															variant="contained"
															color="primary"
															onClick={handleSaveOption}
														>
															Guardar
														</Button>
													</Grid>
												</Grid>
											</Paper>
										)}

										<div style={{ marginTop: 15 }}>
											{queue.options && queue.options.filter(o => !o.parentId).map(opt => (
												<QueueOptionNode
													key={opt.id}
													option={opt}
													allOptions={queue.options}
													onAdd={(parentId) => {
														setActiveOption({ queueId, parentId, option: "", title: "", message: "" });
														setMode("add");
													}}
													onEdit={(optToEdit) => {
														setActiveOption(optToEdit);
														setMode("edit");
													}}
													onDelete={handleDeleteOption}
												/>
											))}
										</div>
									</div>
								)}
							</DialogContent>
							<DialogActions>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									{i18n.t("queueModal.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									color="primary"
									disabled={isSubmitting}
									variant="contained"
									className={classes.btnWrapper}
								>
									{queueId
										? `${i18n.t("queueModal.buttons.okEdit")}`
										: `${i18n.t("queueModal.buttons.okAdd")}`}
									{isSubmitting && (
										<CircularProgress
											size={24}
											className={classes.buttonProgress}
										/>
									)}
								</Button>
							</DialogActions>
						</Form>
					)}
				</Formik>
			</Dialog>
		</div>
	);
};

export default QueueModal;
