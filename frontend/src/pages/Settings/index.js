import React, { useState, useEffect, useContext } from "react";
import openSocket from "../../services/socket-io";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
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

	paperLogo: {
		padding: theme.spacing(2),
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		marginBottom: 12,
	},

	settingOption: {
		marginLeft: "auto",
	},
	margin: {
		margin: theme.spacing(1),
	},

}));

const Settings = () => {
	const classes = useStyles();
	const { user, setUser } = useContext(AuthContext);

	const [settings, setSettings] = useState([]);

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
					const settingIndex = aux.findIndex(s => s.key === data.setting.key);
					aux[settingIndex].value = data.setting.value;
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

	const getSettingValue = key => {
		const { value } = settings.find(s => s.key === key);
		return value;
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
