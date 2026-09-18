import React, { useState, useEffect } from "react";

import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import { Checkbox, ListItemText } from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const TicketsQueueSelect = ({
	userQueues,
	selectedQueueIds = [],
	onChange,
}) => {
	const [allQueues, setAllQueues] = useState([]);

	useEffect(() => {
		const fetchQueues = async () => {
			try {
				const { data } = await api.get("/queue");
				setAllQueues(data || []);
			} catch (err) {
				toastError(err);
			}
		};
		fetchQueues();
	}, []);

	const queuesToDisplay = userQueues && userQueues.length > 0 ? userQueues : allQueues;

	const handleChange = e => {
		onChange(e.target.value);
	};

	return (
		<div style={{ minWidth: 160, marginTop: -4 }}>
			<FormControl fullWidth margin="dense">
				<Select
					multiple
					displayEmpty
					variant="outlined"
					value={selectedQueueIds}
					onChange={handleChange}
					MenuProps={{
						anchorOrigin: {
							vertical: "bottom",
							horizontal: "left",
						},
						transformOrigin: {
							vertical: "top",
							horizontal: "left",
						},
						getContentAnchorEl: null,
					}}
					renderValue={(selected) => {
						if (!selected || selected.length === 0) {
							return "Departamentos";
						}
						if (selected.length === queuesToDisplay.length) {
							return "Todos Deptos";
						}
						return `${selected.length} Depto(s)`;
					}}
				>
					{queuesToDisplay.length > 0 &&
						queuesToDisplay.map(queue => (
							<MenuItem dense key={queue.id} value={queue.id}>
								<Checkbox
									style={{
										color: queue.color || "#2576d2",
									}}
									size="small"
									color="primary"
									checked={selectedQueueIds.indexOf(queue.id) > -1}
								/>
								<ListItemText primary={queue.name} />
							</MenuItem>
						))}
				</Select>
			</FormControl>
		</div>
	);
};

export default TicketsQueueSelect;
