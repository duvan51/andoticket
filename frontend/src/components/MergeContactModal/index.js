import React, { useState, useEffect } from "react";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import { makeStyles } from "@material-ui/core";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Autocomplete from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";
import Typography from "@material-ui/core/Typography";

import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  maxWidth: {
    width: "100%",
  },
}));

const MergeContactModal = ({ open, onClose, sourceContact }) => {
	const classes = useStyles();
	const [options, setOptions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [searchParam, setSearchParam] = useState("");
	const [selectedContact, setSelectedContact] = useState(null);

	useEffect(() => {
		if (!open || searchParam.length < 3) {
			setOptions([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		const delayDebounceFn = setTimeout(() => {
			const fetchContacts = async () => {
				try {
					const { data } = await api.get("contacts", {
						params: { searchParam },
					});
					const filtered = data.contacts.filter(c => c.id !== sourceContact?.id);
					setOptions(filtered);
					setLoading(false);
				} catch (err) {
					setLoading(false);
					toastError(err);
				}
			};

			fetchContacts();
		}, 500);
		return () => clearTimeout(delayDebounceFn);
	}, [searchParam, open, sourceContact]);

	const handleClose = () => {
		onClose();
		setSearchParam("");
		setSelectedContact(null);
	};

	const handleMerge = async () => {
		if (!sourceContact || !selectedContact) return;
		setLoading(true);
		try {
			await api.post(`/contacts/${sourceContact.id}/merge/${selectedContact.id}`);
			toast.success("¡Contactos unificados con éxito!");
			handleClose();
		} catch (err) {
			toastError(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
			<DialogTitle id="form-dialog-title">
				Unificar Contactos
			</DialogTitle>
			<DialogContent dividers>
				<Typography variant="body2" style={{ marginBottom: 15 }} color="textSecondary">
					Seleccione el contacto principal con el cual desea fusionar a <b>{sourceContact?.name}</b>. Toda la historia de chats y mensajes de <b>{sourceContact?.name}</b> se unirá a este contacto seleccionado, y el perfil duplicado se eliminará de forma permanente.
				</Typography>
				<Autocomplete
					options={options}
					loading={loading}
					className={classes.maxWidth}
					clearOnBlur
					autoHighlight
					getOptionLabel={(option) => `${option.name} (${option.number})`}
					onChange={(e, newValue) => setSelectedContact(newValue)}
					renderInput={(params) => (
						<TextField
							{...params}
							label="Buscar contacto principal..."
							variant="outlined"
							autoFocus
							onChange={(e) => setSearchParam(e.target.value)}
							InputProps={{
								...params.InputProps,
								endAdornment: (
									<React.Fragment>
										{loading ? (
											<CircularProgress color="inherit" size={20} />
										) : null}
										{params.InputProps.endAdornment}
									</React.Fragment>
								),
							}}
						/>
					)}
				/>
			</DialogContent>
			<DialogActions>
				<Button
					onClick={handleClose}
					color="secondary"
					disabled={loading}
					variant="outlined"
				>
					Cancelar
				</Button>
				<ButtonWithSpinner
					onClick={handleMerge}
					color="primary"
					disabled={loading || !selectedContact}
					variant="contained"
					loading={loading}
				>
					Unificar
				</ButtonWithSpinner>
			</DialogActions>
		</Dialog>
	);
};

export default MergeContactModal;
