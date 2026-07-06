import React, { useEffect, useState } from "react";
import QRCode from "qrcode.react";
import openSocket from "../../services/socket-io";
import toastError from "../../errors/toastError";

import { 
    Dialog, 
    DialogContent, 
    Paper, 
    Typography, 
    makeStyles, 
    Box, 
    CircularProgress 
} from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(4),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    borderRadius: 20,
    backgroundColor: theme.palette.background.paper,
  },
  title: {
    fontWeight: "bold",
    marginBottom: theme.spacing(2),
    color: theme.palette.primary.main,
  },
  qrContainer: {
    padding: theme.spacing(2),
    backgroundColor: "#fff",
    borderRadius: 20,
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    marginBottom: theme.spacing(3),
  },
  instructions: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
  },
  whatsappName: {
     fontWeight: "600",
     color: theme.palette.text.primary,
     marginBottom: theme.spacing(1)
  }
}));

const QrcodeModal = ({ open, onClose, whatsAppId, whatsAppName, onSuccess }) => {
	const classes = useStyles();
	const [qrCode, setQrCode] = useState("");

	useEffect(() => {
		const fetchSession = async () => {
			if (!whatsAppId) return;

			try {
				const { data } = await api.get(`/whatsapp/${whatsAppId}`);
				setQrCode(data.qrcode);
			} catch (err) {
				toastError(err);
			}
		};
		fetchSession();
	}, [whatsAppId]);

	useEffect(() => {
		if (!whatsAppId) return;
		const socket = openSocket();

		const handleSessionUpdate = (session) => {
			if (session.id == whatsAppId) {
				setQrCode(session.qrcode);
				if (session.status === "CONNECTED" || session.status === "READY") {
					if (typeof onSuccess === "function") {
						onSuccess();
					}
					onClose();
				}
				if (session.qrcode === "" && (session.status === "DISCONNECTED" || session.status === "TIMEOUT")) {
					onClose();
				}
			}
		};

		socket.on("whatsappSession", data => {
			if (data.action === "update") {
				handleSessionUpdate(data.session);
			}
		});

		socket.on("whatsapp", data => {
			if (data.action === "update") {
				handleSessionUpdate(data.whatsapp);
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [whatsAppId, onClose, onSuccess]);

	return (
		<Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{
              style: { borderRadius: 20 }
            }}
        >
			<DialogContent>
				<Box className={classes.paper}>
					<Typography variant="h5" className={classes.title}>
						Vincular WhatsApp
					</Typography>
                    
                    {whatsAppName && (
                        <Typography variant="subtitle1" className={classes.whatsappName}>
                            Conexión: {whatsAppName}
                        </Typography>
                    )}

					<Typography variant="body2" className={classes.instructions}>
						{i18n.t("qrCode.message")}
					</Typography>

					<Box className={classes.qrContainer}>
						{qrCode ? (
							<QRCode value={qrCode} size={256} level="H" />
						) : (
							<Box display="flex" flexDirection="column" alignItems="center" p={8}>
                                <CircularProgress size={60} />
                                <Typography variant="caption" style={{ marginTop: 20 }}>
                                    Generando código QR...
                                </Typography>
                            </Box>
						)}
					</Box>

                    <Typography variant="caption" color="textSecondary">
                        Abra WhatsApp en su teléfono, toque Menú o Configuración y seleccione Dispositivos vinculados.
                    </Typography>
				</Box>
			</DialogContent>
		</Dialog>
	);
};

export default React.memo(QrcodeModal);
