import React from "react";

import { Avatar, CardHeader } from "@material-ui/core";
import TagsSelect from "../TagsSelect";

import { i18n } from "../../translate/i18n";

const TicketInfo = ({ contact, ticket, onClick }) => {
	return (
		<CardHeader
			onClick={onClick}
			style={{ cursor: "pointer", padding: "8px 12px" }}
			titleTypographyProps={{ noWrap: true, style: { fontSize: "14px" } }}
			subheaderTypographyProps={{ noWrap: true, style: { fontSize: "12px" } }}
			avatar={<Avatar src={contact.profilePicUrl} alt="contact_image" style={{ width: 36, height: 36 }} />}
			title={`${contact.name} #${ticket.id}`}
			subheader={
				<>
					{ticket.user &&
						`${i18n.t("messagesList.header.assignedTo")} ${ticket.user.name}`}
					<TagsSelect ticket={ticket} />
				</>
			}
		/>
	);
};

export default TicketInfo;
