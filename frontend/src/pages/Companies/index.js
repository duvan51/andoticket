import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import Chip from "@material-ui/core/Chip";
import Tooltip from "@material-ui/core/Tooltip";

import IconButton from "@material-ui/core/IconButton";
import EditIcon from "@material-ui/icons/Edit";
import Button from "@material-ui/core/Button";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import toastError from "../../errors/toastError";
import CompanyModal from "../../components/CompanyModal";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  chip: {
    margin: theme.spacing(0.5),
  },
}));

const Companies = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/companies");
      setCompanies(data);
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenCompanyModal = () => {
    setSelectedCompanyId(null);
    setCompanyModalOpen(true);
  };

  const handleCloseCompanyModal = () => {
    setSelectedCompanyId(null);
    setCompanyModalOpen(false);
    fetchCompanies();
  };

  const handleEditCompany = (companyId) => {
    setSelectedCompanyId(companyId);
    setCompanyModalOpen(true);
  };

  return (
    <MainContainer>
      <CompanyModal
        open={companyModalOpen}
        onClose={handleCloseCompanyModal}
        companyId={selectedCompanyId}
      />
      <MainHeader>
        <Title>Gestión de Empresas (Super Admin)</Title>
        <MainHeaderButtonsWrapper>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenCompanyModal}
          >
            Agregar Empresa
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper className={classes.mainPaper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">ID</TableCell>
              <TableCell align="center">Nombre del Negocio</TableCell>
              <TableCell align="center">Plan</TableCell>
              <TableCell align="center">Administradores</TableCell>
              <TableCell align="center">Usuarios</TableCell>
              <TableCell align="center">Bots</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRowSkeleton columns={8} />
            ) : (
              companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell align="center">{company.id}</TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" style={{ fontWeight: "bold" }}>
                      {company.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {company.email}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={company.planData?.name || "N/A"}
                      variant="outlined"
                      color="secondary"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {company.users
                      ?.filter((u) => u.profile === "admin")
                      .map((u) => (
                        <Tooltip key={u.id} title={u.email}>
                          <Chip
                            label={u.name}
                            size="small"
                            className={classes.chip}
                            color="primary"
                          />
                        </Tooltip>
                      ))}
                  </TableCell>
                  <TableCell align="center">
                    {company.users
                      ?.filter((u) => u.profile !== "admin")
                      .map((u) => (
                        <Tooltip key={u.id} title={u.email}>
                          <Chip
                            label={u.name}
                            size="small"
                            className={classes.chip}
                          />
                        </Tooltip>
                      ))}
                  </TableCell>
                  <TableCell align="center">
                    {company.whatsapps?.map((w) => (
                      <Chip
                        key={w.id}
                        label={w.name}
                        size="small"
                        color={w.status === "CONNECTED" ? "primary" : "default"}
                        variant="outlined"
                        className={classes.chip}
                      />
                    ))}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={company.status ? "Activo" : "Inactivo"}
                      color={company.status ? "primary" : "secondary"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleEditCompany(company.id)}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default Companies;
