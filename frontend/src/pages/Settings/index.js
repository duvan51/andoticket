import React, { useState, useEffect, useContext } from "react";
import openSocket from "../../services/socket-io";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import { toast } from "react-toastify";

import api from "../../services/api";
import { i18n } from "../../translate/i18n.js";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { getBackendUrl } from "../../config";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		alignItems: "center",
		padding: theme.spacing(8, 8, 3),
	},

	paper: {
		padding: theme.spacing(2),
		display: "flex",
		alignItems: "center",
		marginBottom: 12,
	},

	paperCard: {
		padding: theme.spacing(3),
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		marginBottom: 16,
		gap: theme.spacing(2),
	},

	paperLogo: {
		padding: theme.spacing(2),
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		marginBottom: 12,
	},

	settingOption: {
		marginLeft: "auto",
		minWidth: 180,
	},
	settingTextContainer: {
		display: "flex",
		flexDirection: "column",
		marginRight: theme.spacing(2),
	},
	margin: {
		margin: theme.spacing(1),
	},
	buttonGroup: {
		display: "flex",
		gap: theme.spacing(1),
		marginTop: theme.spacing(1),
	}
}));

const Settings = () => {
	const classes = useStyles();
	const { user, setUser } = useContext(AuthContext);

	const [settings, setSettings] = useState([]);
	const [externalApiUrl, setExternalApiUrl] = useState("");
	const [externalApiKey, setExternalApiKey] = useState("");
	const [testingApi, setTestingApi] = useState(false);
	const [savingApi, setSavingApi] = useState(false);
	const [syncingContacts, setSyncingContacts] = useState(false);

	const getSettingValue = key => {
		if (!settings || !Array.isArray(settings)) return "";
		const setting = settings.find(s => s.key === key);
		return setting ? setting.value : "";
	};

	useEffect(() => {
		if (settings && settings.length > 0) {
			setExternalApiUrl(getSettingValue("externalProductsApiUrl") || "");
			setExternalApiKey(getSettingValue("externalProductsApiKey") || "");
		}
	}, [settings]);

	useEffect(() => {
		const fetchSession = async () => {
			try {
				const { data } = await api.get("/settings");
				setSettings(data);
			} catch (err) {
				toastError(err);
			}
		};
		fetchSession();
	}, []);

	useEffect(() => {
		const socket = openSocket();

		socket.on("settings", data => {
			if (data.action === "update") {
				setSettings(prevState => {
					const aux = [...prevState];
					const settingIndex = aux.findIndex(s => s.key === data.setting?.key);
					if (settingIndex !== -1) {
						aux[settingIndex].value = data.setting.value;
					} else if (data.setting) {
						aux.push(data.setting);
					}
					return aux;
				});
			}
		});

		return () => {
			socket.disconnect();
		};
	}, []);

	const handleChangeSetting = async e => {
		const selectedValue = e.target.value;
		const settingKey = e.target.name;

		try {
			await api.put(`/settings/${settingKey}`, {
				value: selectedValue,
			});
			toast.success(i18n.t("settings.success"));
		} catch (err) {
			toastError(err);
		}
	};

	const handleSaveApiSettings = async () => {
		setSavingApi(true);
		try {
			await api.put(`/settings/externalProductsApiUrl`, {
				value: externalApiUrl,
			});
			await api.put(`/settings/externalProductsApiKey`, {
				value: externalApiKey,
			});
			toast.success("Configuración de API de Productos guardada con éxito.");
		} catch (err) {
			toastError(err);
		} finally {
			setSavingApi(false);
		}
	};

	const handleTestApiConnection = async () => {
		if (!externalApiUrl) {
			toast.error("Por favor ingresa la URL de la API antes de probar la conexión.");
			return;
		}
		setTestingApi(true);
		try {
			// Save first so test endpoint uses latest saved settings
			await api.put(`/settings/externalProductsApiUrl`, { value: externalApiUrl });
			await api.put(`/settings/externalProductsApiKey`, { value: externalApiKey });

			const { data } = await api.get("/settings/external-products");
			if (Array.isArray(data)) {
				toast.success(`¡Conexión exitosa! Se obtuvieron ${data.length} productos.`);
			} else {
				toast.warning("La API respondió, pero no devolvió una lista de productos estándar.");
			}
		} catch (err) {
			toastError(err);
		} finally {
			setTestingApi(false);
		}
	};

	const handleClearApiSettings = async () => {
		setSavingApi(true);
		try {
			await api.put(`/settings/externalProductsApiUrl`, { value: "" });
			await api.put(`/settings/externalProductsApiKey`, { value: "" });
			setExternalApiUrl("");
			setExternalApiKey("");
			toast.success("Configuración de API eliminada con éxito.");
		} catch (err) {
			toastError(err);
		} finally {
			setSavingApi(false);
		}
	};

	const handleSyncDuplicates = async () => {
		setSyncingContacts(true);
		try {
			const { data } = await api.post("/contacts/merge-duplicates");
			toast.success(`¡Sincronización completa! Se unificaron ${data.mergedCount} contactos duplicados y sus chats.`);
		} catch (err) {
			toastError(err);
		} finally {
			setSyncingContacts(false);
		}
	};

	return (
		<div className={classes.root}>
			<Container className={classes.container} maxWidth="sm">
				<Typography variant="body2" gutterBottom>
					{i18n.t("settings.title")}
				</Typography>
				<Paper className={classes.paper}>
					<Typography variant="body1">
						{i18n.t("settings.settings.userCreation.name")}
					</Typography>
					<Select
						margin="dense"
						variant="outlined"
						native
						id="userCreation-setting"
						name="userCreation"
						value={
							settings && settings.length > 0 && getSettingValue("userCreation")
						}
						className={classes.settingOption}
						onChange={handleChangeSetting}
					>
						<option value="enabled">
							{i18n.t("settings.settings.userCreation.options.enabled")}
						</option>
						<option value="disabled">
							{i18n.t("settings.settings.userCreation.options.disabled")}
						</option>
					</Select>
				</Paper>

				<Paper className={classes.paper}>
					<div className={classes.settingTextContainer}>
						<Typography variant="body1">
							{i18n.t("settings.settings.botEnabled.name")}
						</Typography>
						<Typography variant="caption" color="textSecondary">
							{i18n.t("settings.settings.botEnabled.note")}
						</Typography>
					</div>
					<Select
						margin="dense"
						variant="outlined"
						native
						id="botEnabled-setting"
						name="botEnabled"
						value={
							(settings && settings.length > 0 && getSettingValue("botEnabled")) || "enabled"
						}
						className={classes.settingOption}
						onChange={handleChangeSetting}
					>
						<option value="enabled">
							{i18n.t("settings.settings.botEnabled.options.enabled")}
						</option>
						<option value="disabled">
							{i18n.t("settings.settings.botEnabled.options.disabled")}
						</option>
					</Select>
				</Paper>

				<Paper className={classes.paper}>
					<div className={classes.settingTextContainer}>
						<Typography variant="body1">
							{i18n.t("settings.settings.botAutoStopOnReply.name")}
						</Typography>
						<Typography variant="caption" color="textSecondary">
							{i18n.t("settings.settings.botAutoStopOnReply.note")}
						</Typography>
					</div>
					<Select
						margin="dense"
						variant="outlined"
						native
						id="botAutoStopOnReply-setting"
						name="botAutoStopOnReply"
						value={
							(settings && settings.length > 0 && getSettingValue("botAutoStopOnReply")) || "enabled"
						}
						className={classes.settingOption}
						onChange={handleChangeSetting}
					>
						<option value="enabled">
							{i18n.t("settings.settings.botAutoStopOnReply.options.enabled")}
						</option>
						<option value="disabled">
							{i18n.t("settings.settings.botAutoStopOnReply.options.disabled")}
						</option>
					</Select>
				</Paper>

				<Paper className={classes.paper}>
					<TextField
						id="api-token-setting"
						readonly
						label="Token Api"
						margin="dense"
						variant="outlined"
						fullWidth
						value={settings && settings.length > 0 && getSettingValue("userApiToken")}
					/>
				</Paper>

				<Paper className={classes.paperCard}>
					<Typography variant="h6" style={{ fontSize: "1.1rem", fontWeight: 600 }}>
						Configuración de API Externa de Productos
					</Typography>
					<Typography variant="body2" color="textSecondary">
						Configura la URL y opcionalmente un Token / API Key de autenticación (para Supabase, WooCommerce o tu propio backend).
					</Typography>

					<TextField
						id="external-products-api-setting"
						label="URL de la API de Productos"
						placeholder="https://tu-proyecto.supabase.co/functions/v1/catalogo"
						margin="dense"
						variant="outlined"
						fullWidth
						value={externalApiUrl}
						onChange={(e) => setExternalApiUrl(e.target.value)}
					/>

					<TextField
						id="external-products-api-key-setting"
						label="Token / API Key (Opcional - Autorización)"
						placeholder="Bearer eyJhbGciOi..."
						margin="dense"
						variant="outlined"
						fullWidth
						value={externalApiKey}
						onChange={(e) => setExternalApiKey(e.target.value)}
					/>

					<div className={classes.buttonGroup}>
						<Button
							variant="contained"
							color="primary"
							onClick={handleSaveApiSettings}
							disabled={savingApi}
						>
							{savingApi ? <CircularProgress size={24} /> : "Guardar"}
						</Button>
						<Button
							variant="outlined"
							color="primary"
							onClick={handleTestApiConnection}
							disabled={testingApi}
						>
							{testingApi ? <CircularProgress size={24} /> : "Probar Conexión"}
						</Button>
						<Button
							variant="outlined"
							color="secondary"
							onClick={handleClearApiSettings}
							disabled={savingApi}
						>
							Eliminar
						</Button>
					</div>
				</Paper>

				<Paper className={classes.paperCard}>
					<Typography variant="h6" style={{ fontSize: "1.1rem", fontWeight: 600 }}>
						Unificar Contactos Duplicados
					</Typography>
					<Typography variant="body2" color="textSecondary">
						Esta herramienta escanea la base de datos para buscar y fusionar contactos duplicados (por ejemplo, números con y sin código de país como 57). Toda la historia de sus chats y mensajes se vinculará bajo un único contacto.
					</Typography>
					<Button
						variant="contained"
						color="primary"
						onClick={handleSyncDuplicates}
						disabled={syncingContacts}
					>
						{syncingContacts ? <CircularProgress size={24} /> : "Buscar y Unificar"}
					</Button>
				</Paper>

				<Paper className={classes.paperLogo}>
					<Typography variant="body1" style={{ marginBottom: 10 }}>
						Logo de la Empresa
					</Typography>
					{user?.company?.logo && (
						<img
							src={`${getBackendUrl()}/public/${user.company.logo}`.replace(/([^:]\/)\/+/g, "$1")}
							alt="Logo de la empresa"
							style={{ maxHeight: 120, maxWidth: "100%", marginBottom: 15, borderRadius: 4, objectFit: 'contain' }}
						/>
					)}
					<Button
						variant="contained"
						component="label"
						color="primary"
					>
						Subir Logo
						<input
							type="file"
							accept="image/*"
							hidden
							onChange={async (e) => {
								const file = e.target.files[0];
								if (!file) return;

								const formData = new FormData();
								formData.append("logo", file);

								try {
									const { data } = await api.post("/settings/logo", formData, {
										headers: {
											"Content-Type": "multipart/form-data"
										}
									});
									const updatedUser = { ...user, company: data };
									setUser(updatedUser);
									toast.success("Logo actualizado con éxito.");
								} catch (err) {
									toastError(err);
								}
							}}
						/>
					</Button>
				</Paper>
			</Container>
		</div>
	);
};

export default Settings;
