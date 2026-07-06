import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  TextField,
  makeStyles,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  Tabs,
  Tab,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton
} from "@material-ui/core";

import EditIcon from "@material-ui/icons/Edit";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import UserModal from "../UserModal";
import ConfirmationModal from "../ConfirmationModal";

import { green } from "@material-ui/core/colors";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  multFieldLine: {
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
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
}));

const CompanySchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Demasiado corto")
    .max(50, "Demasiado largo")
    .required("Obligatorio"),
  email: Yup.string().email("Email inválido").required("Obligatorio"),
  password: Yup.string().when("id", {
    is: (id) => !id,
    then: Yup.string().required("Obligatorio").min(5, "Mínimo 5 caracteres"),
  }),
});

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          <Typography component="div">{children}</Typography>
        </Box>
      )}
    </div>
  );
};

const CompanyModal = ({ open, onClose, companyId }) => {
  const classes = useStyles();

  const initialState = {
    name: "",
    email: "",
    password: "",
    planId: "",
    status: true,
    dueDate: "",
  };

  const [company, setCompany] = useState(initialState);
  const [plans, setPlans] = useState([]);
  const [tab, setTab] = useState(0);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [confirmCompanyDeleteOpen, setConfirmCompanyDeleteOpen] = useState(false);
  const [confirmUserDeleteOpen, setConfirmUserDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data } = await api.get("/plans");
        setPlans(data);
      } catch (err) {
        toastError(err);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!companyId) return;
      try {
        const { data } = await api.get(`/companies/${companyId}`);
        setCompany({
            ...data,
            password: "",
            dueDate: data.dueDate ? data.dueDate.split('T')[0] : ""
        });
      } catch (err) {
        toastError(err);
      }
    };

    if (open) {
        fetchCompany();
    }
  }, [companyId, open]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!companyId || tab !== 1) return;
      setLoadingUsers(true);
      try {
        const { data } = await api.get("/users/", {
          params: { companyId },
        });
        setUsers(data.users);
      } catch (err) {
        toastError(err);
      }
      setLoadingUsers(false);
    };

    if (open) {
        fetchUsers();
    }
  }, [companyId, tab, open]);

  const handleOpenUserModal = () => {
    setSelectedUserId(null);
    setUserModalOpen(true);
  };

  const handleEditUser = (userId) => {
    setSelectedUserId(userId);
    setUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setSelectedUserId(null);
    setUserModalOpen(false);
    // Refresh users
    if (tab === 1) {
        const fetchUsers = async () => {
            try {
              const { data } = await api.get("/users/", {
                params: { companyId },
              });
              setUsers(data.users);
            } catch (err) {
              toastError(err);
            }
          };
          fetchUsers();
    }
  };

  const handleClose = () => {
    onClose();
    setCompany(initialState);
    setTab(0);
  };

  const handleSaveCompany = async (values) => {
    try {
      if (companyId) {
        await api.put(`/companies/${companyId}`, values);
        toast.success("Empresa actualizada satisfactoriamente.");
      } else {
        await api.post("/companies", values);
        toast.success("Empresa y administrador creados satisfactoriamente.");
      }
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDeleteCompany = async () => {
    try {
        await api.delete(`/companies/${companyId}`);
        toast.success("Empresa eliminada satisfactoriamente.");
        handleClose();
    } catch (err) {
        toastError(err);
    }
  };

  const handleDeleteUser = async () => {
    try {
        await api.delete(`/users/${userToDelete}`);
        toast.success(i18n.t("users.toasts.deleted"));
        // Refresh users
        const { data } = await api.get("/users/", {
            params: { companyId },
        });
        setUsers(data.users);
    } catch (err) {
        toastError(err);
    }
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          {companyId ? `Gestionar Negocio: ${company.name}` : "Agregar Nueva Empresa"}
        </DialogTitle>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Configuración" />
          <Tab label="Usuarios" disabled={!companyId} />
        </Tabs>

        <TabPanel value={tab} index={0}>
        <Formik
          initialValues={company}
          enableReinitialize={true}
          validationSchema={CompanySchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveCompany(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ touched, errors, isSubmitting, values, setFieldValue }) => (
            <Form>
              <DialogContent dividers>
                <div style={{ marginBottom: 15 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                        Información del Negocio y Administrador
                    </Typography>
                </div>
                <Field
                  as={TextField}
                  label="Nombre del Negocio"
                  autoFocus
                  name="name"
                  error={touched.name && Boolean(errors.name)}
                  helperText={touched.name && errors.name}
                  variant="outlined"
                  margin="dense"
                  fullWidth
                />
                <Field
                  as={TextField}
                  label="Email del Administrador"
                  name="email"
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                  variant="outlined"
                  margin="dense"
                  fullWidth
                />
                {!companyId && (
                    <Field
                        as={TextField}
                        label="Contraseña"
                        name="password"
                        type="password"
                        error={touched.password && Boolean(errors.password)}
                        helperText={touched.password && errors.password}
                        variant="outlined"
                        margin="dense"
                        fullWidth
                    />
                )}
                <FormControl variant="outlined" fullWidth margin="dense">
                  <InputLabel id="plan-selection-label">Plan</InputLabel>
                  <Field
                    as={Select}
                    label="Plan"
                    placeholder="Plan"
                    labelId="plan-selection-label"
                    id="plan-selection"
                    name="planId"
                  >
                    {plans.map((plan, key) => (
                      <MenuItem key={key} value={plan.id}>
                        {plan.name}
                      </MenuItem>
                    ))}
                  </Field>
                </FormControl>
                {companyId && (
                    <FormControl variant="outlined" fullWidth margin="dense">
                        <InputLabel id="status-selection-label">Estado</InputLabel>
                        <Field
                            as={Select}
                            label="Estado"
                            labelId="status-selection-label"
                            id="status-selection"
                            name="status"
                        >
                            <MenuItem value={true}>Activo</MenuItem>
                            <MenuItem value={false}>Inactivo</MenuItem>
                        </Field>
                    </FormControl>
                )}
                <Field
                  as={TextField}
                  label="Vencimiento"
                  name="dueDate"
                  type="date"
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </DialogContent>
              <DialogActions>
                {companyId && (
                    <Button
                        color="secondary"
                        variant="outlined"
                        onClick={() => setConfirmCompanyDeleteOpen(true)}
                        style={{ marginRight: 'auto' }}
                    >
                        Eliminar Empresa
                    </Button>
                )}
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {companyId ? "Guardar" : "Crear Empresa"}
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
        </TabPanel>

        <TabPanel value={tab} index={1}>
           <Box display="flex" justifyContent="flex-end" mb={1}>
                <Button variant="contained" color="primary" onClick={handleOpenUserModal}>
                    Agregar Usuario
                </Button>
           </Box>
           <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Perfil</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {users.map(u => (
                        <TableRow key={u.id}>
                            <TableCell>{u.name}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.profile}</TableCell>
                            <TableCell align="center">
                                <IconButton size="small" onClick={() => handleEditUser(u.id)}>
                                    <EditIcon />
                                </IconButton>
                                <IconButton 
                                    size="small" 
                                    onClick={() => {
                                        setUserToDelete(u.id);
                                        setConfirmUserDeleteOpen(true);
                                    }}
                                >
                                    <DeleteOutlineIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                    {loadingUsers && <TableRowSkeleton columns={4} />}
                </TableBody>
           </Table>
        </TabPanel>

        <UserModal
            open={userModalOpen}
            onClose={handleCloseUserModal}
            userId={selectedUserId}
            companyId={companyId}
        />

        <ConfirmationModal
            title="¿Eliminar Empresa?"
            open={confirmCompanyDeleteOpen}
            onClose={setConfirmCompanyDeleteOpen}
            onConfirm={handleDeleteCompany}
        >
            ¿Estás seguro? Esta acción eliminará permanentemente la empresa, todos sus usuarios, tickets, conexiones y datos asociados. Esta acción no se puede deshacer.
        </ConfirmationModal>

        <ConfirmationModal
            title="¿Eliminar Usuario?"
            open={confirmUserDeleteOpen}
            onClose={setConfirmUserDeleteOpen}
            onConfirm={handleDeleteUser}
        >
            ¿Estás seguro de que deseas eliminar este usuario?
        </ConfirmationModal>
      </Dialog>
    </div>
  );
};

export default CompanyModal;
