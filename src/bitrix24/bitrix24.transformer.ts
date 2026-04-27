import { Injectable } from "@nestjs/common";
import {
	MessageTransformer,
	Message,
	GreenApiWebhook,
	formatPhoneNumber,
	GreenApiLogger,
	extractPhoneNumberFromVCard,
	QuotedMessage,
} from "@green-api/greenapi-integration";
import { Bitrix24PlatformMessage } from "../types";
import { Bitrix24WebhookDto, BitrixFileDto } from "./dto/bitrix24-webhook.dto";

@Injectable()
export class Bitrix24Transformer implements MessageTransformer<Bitrix24WebhookDto, Bitrix24PlatformMessage> {
	private readonly logger = GreenApiLogger.getInstance(Bitrix24Transformer.name);

	private formatGroupMessage(messageText: string, senderName: string, senderPhone: string, isFromGroup: boolean): string {
		if (!isFromGroup || !senderName) {
			return messageText;
		}
		return `${senderName} (+${senderPhone}):\n\n ${messageText}`;
	}

	toPlatformMessage(webhook: GreenApiWebhook): Bitrix24PlatformMessage {
		this.logger.debug(`Transforming GREEN-API webhook to Bitrix24 message: ${JSON.stringify(webhook)}`);

		let messageText = "";
		const attachments: Bitrix24PlatformMessage["attachments"] = [];

		if (webhook.typeWebhook === "incomingMessageReceived") {
			const msgData = webhook.messageData;
			const chatId = webhook.senderData.chatId;
			const isFromGroup = chatId.endsWith("@g.us");
			const senderPhone = webhook.senderData.sender.replace("@c.us", "");
			const senderName = webhook.senderData.senderName || webhook.senderData.senderContactName || `WhatsApp ${senderPhone}`;

			let conversationId: string;
			let conversationName: string;

			if (isFromGroup) {
				conversationId = chatId.replace("@g.us", "");
				conversationName = `${webhook.senderData.chatName} (Group)` || `WhatsApp Group ${conversationId} (Group)`;
				this.logger.info(`Processing group message from group: ${conversationName} (${chatId}), sender: ${senderName} (+${senderPhone})`);
			} else {
				conversationId = senderPhone;
				conversationName = senderName;
				this.logger.info(`Processing individual message from: ${senderName} (+${senderPhone})`);
			}

			switch (msgData.typeMessage) {
				case "textMessage":
					messageText = msgData.textMessageData?.textMessage || "";
					break;

				case "extendedTextMessage":
					messageText = msgData.extendedTextMessageData?.text || "";
					break;

				case "quotedMessage":
					messageText = msgData.extendedTextMessageData?.text || "";
					if (msgData.quotedMessage) {
						const quotedText = this.formatQuotedMessage(msgData.quotedMessage);
						messageText = `${quotedText}\n\n${messageText}`;
					}
					break;

				case "imageMessage":
				case "videoMessage":
				case "documentMessage":
				case "audioMessage":
					messageText = msgData.fileMessageData?.caption || "";
					if (msgData.fileMessageData?.downloadUrl) {
						attachments.push({
							url: msgData.fileMessageData.downloadUrl,
							fileName: msgData.fileMessageData.fileName,
							type: msgData.fileMessageData.mimeType,
						});
					}
					break;

				case "stickerMessage":
					messageText = msgData.fileMessageData?.caption || "🎨 Sticker received";
					if (msgData.fileMessageData?.downloadUrl) {
						attachments.push({
							url: msgData.fileMessageData.downloadUrl,
							fileName: msgData.fileMessageData.fileName || "sticker.webp",
							type: msgData.fileMessageData.mimeType || "image/webp",
						});
					}
					break;

				case "locationMessage":
					const location = msgData.locationMessageData;
					messageText = [
						"📍 Location shared:",
						location.nameLocation && `Location: ${location.nameLocation}`,
						location.address && `Address: ${location.address}`,
						`Map: https://www.google.com/maps?q=${location.latitude},${location.longitude}`,
					].filter(Boolean).join("\n");
					break;

				case "contactMessage":
					const contact = msgData.contactMessageData;
					const phone = extractPhoneNumberFromVCard(contact.vcard);
					messageText = [
						"👤 Contact shared:",
						contact.displayName && `Name: ${contact.displayName}`,
						phone && `Phone: ${phone}`,
					].filter(Boolean).join("\n");
					break;

				case "contactsArrayMessage":
					const contactsArray = msgData.messageData?.contacts || [];
					const contactsText = contactsArray
						.map((c) => {
							const p = extractPhoneNumberFromVCard(c.vcard);
							return `👤 ${c.displayName}${p ? ` (${p})` : ""}`;
						})
						.join("\n");
					messageText = `👥 Multiple contacts shared:\n${contactsText}`;
					break;

				case "pollMessage":
					const poll = msgData.pollMessageData;
					if (poll) {
						messageText = [
							"📊 Poll: " + poll.name,
							"Options:",
							...poll.options.map((opt, index) => `${index + 1}. ${opt.optionName}`),
							poll.multipleAnswers ? "(Multiple answers allowed)" : "(Single answer only)",
						].join("\n");
					} else {
						messageText = "📊 Poll received";
					}
					break;

				case "pollUpdateMessage":
					const pollUpdate = msgData.pollMessageData;
					if (pollUpdate) {
						let updateText = `📊 Poll "${pollUpdate.name}" updated.\nVotes:\n`;
						pollUpdate.votes?.forEach((vote) => {
							updateText += `• ${vote.optionName}: ${vote.optionVoters?.length || 0} vote(s)\n`;
						});
						messageText = updateText;
					} else {
						messageText = "📊 Poll was updated";
					}
					break;

				case "editedMessage":
					const editedText = msgData.editedMessageData?.textMessage ?? msgData.editedMessageData?.caption ?? "";
					messageText = `✏️ Message edited to: "${editedText}"${msgData.editedMessageData?.stanzaId ? ` (ID: ${msgData.editedMessageData.stanzaId})` : ""}`;
					break;

				case "deletedMessage":
					messageText = `🗑️ Message deleted${msgData.deletedMessageData?.stanzaId ? ` (ID: ${msgData.deletedMessageData.stanzaId})` : ""}`;
					break;

				case "reactionMessage":
					const reaction = msgData.extendedTextMessageData;
					const reactionText = reaction?.text;
					messageText = `${reactionText} Reacted to a message`;
					if (msgData.quotedMessage) {
						const quotedText = this.formatQuotedMessage(msgData.quotedMessage);
						messageText = `${quotedText}\n\n${messageText}`;
					}
					break;

				case "buttonsMessage":
					const buttons = msgData.buttonsMessage;
					if (buttons) {
						const buttonsList = buttons.buttons?.map((button) => `• ${button.buttonText}`).join("\n") || "";
						messageText = [
							"🔘 Interactive message with buttons:",
							buttons.contentText,
							buttonsList && `\nButtons:\n${buttonsList}`,
							buttons.footer && `\nFooter: ${buttons.footer}`,
						].filter(Boolean).join("\n");
					} else {
						messageText = "🔘 Interactive message with buttons received";
					}
					break;

				case "listMessage":
					const list = msgData.listMessage;
					if (list) {
						const sectionsList = list.sections
							?.map((section) => {
								const options = section.rows
									?.map((row) => `  • ${row.title}${row.description ? `: ${row.description}` : ""}`)
									.join("\n");
								return `${section.title}:\n${options}`;
							})
							.join("\n\n") || "";
						messageText = [
							"📝 Interactive list message:",
							list.contentText,
							sectionsList,
							list.footer && `\nFooter: ${list.footer}`,
						].filter(Boolean).join("\n");
					} else {
						messageText = "📝 Interactive list message received";
					}
					break;

				case "templateMessage":
					const template = msgData.templateMessage;
					if (template) {
						const templateButtons = template.buttons
							?.map((button) => {
								if (button.urlButton) return `• Link: ${button.urlButton.displayText}`;
								if (button.callButton) return `• Call: ${button.callButton.displayText}`;
								if (button.quickReplyButton) return `• Reply: ${button.quickReplyButton.displayText}`;
								return null;
							})
							.filter(Boolean)
							.join("\n") || "";
						messageText = [
							"📋 Template message:",
							template.contentText,
							templateButtons && `\nActions:\n${templateButtons}`,
							template.footer && `\nFooter: ${template.footer}`,
						].filter(Boolean).join("\n");
					} else {
						messageText = "📋 Template message received";
					}
					break;

				case "groupInviteMessage":
					const invite = msgData.groupInviteMessageData;
					messageText = `👥 Group invitation${invite?.groupName ? ` for "${invite.groupName}"` : ""}${invite?.caption ? `\nCaption: ${invite.caption}` : ""}`;
					break;

				case "interactiveButtons":
					const interactiveButtons = msgData.interactiveButtons;
					if (interactiveButtons) {
						const buttonsList = interactiveButtons.buttons
							?.map((button) => {
								let buttonDescription = `• ${button.buttonText}`;
								if (button.type === "url" && button.url) {
									buttonDescription += ` (${button.url})`;
								} else if (button.type === "call" && button.phoneNumber) {
									buttonDescription += ` (📞 ${button.phoneNumber})`;
								} else if (button.type === "copy" && button.copyCode) {
									buttonDescription += ` (📋 Copy: "${button.copyCode}")`;
								}
								return buttonDescription;
							})
							.join("\n") || "";

						messageText = [
							"🔘 Interactive message with buttons:",
							interactiveButtons.titleText && `Title: ${interactiveButtons.titleText}`,
							interactiveButtons.contentText,
							buttonsList && `\nButtons:\n${buttonsList}`,
							interactiveButtons.footerText && `\nFooter: ${interactiveButtons.footerText}`,
						].filter(Boolean).join("\n");
					} else {
						messageText = "🔘 Interactive message with buttons received";
					}
					break;

				case "interactiveButtonsReply":
					const interactiveButtonsReply = msgData.interactiveButtonsReply;
					if (interactiveButtonsReply) {
						const replyButtonsList = interactiveButtonsReply.buttons
							?.map((button) => `• ${button.buttonText}`)
							.join("\n") || "";

						messageText = [
							"💬 Interactive reply message with buttons:",
							interactiveButtonsReply.titleText && `Title: ${interactiveButtonsReply.titleText}`,
							interactiveButtonsReply.contentText,
							replyButtonsList && `\nReply options:\n${replyButtonsList}`,
							interactiveButtonsReply.footerText && `\nFooter: ${interactiveButtonsReply.footerText}`,
						].filter(Boolean).join("\n");
					} else {
						messageText = "💬 Interactive reply message with buttons received";
					}
					break;

				case "templateButtonsReplyMessage":
					const templateButtonReply = msgData.templateButtonReplyMessage;
					if (templateButtonReply) {
						messageText = [
							"✅ Button clicked:",
							`Selected: "${templateButtonReply.selectedDisplayText}"`,
							templateButtonReply.selectedId && `Button ID: ${templateButtonReply.selectedId}`,
							templateButtonReply.selectedIndex !== undefined && `Position: ${templateButtonReply.selectedIndex + 1}`,
						].filter(Boolean).join("\n");
					} else {
						messageText = "✅ Button was clicked";
					}
					break;

				default:
					this.logger.warn(`Unsupported GREEN-API message type`, msgData);
					messageText = "📱 Received unknown message type";
			}

			const formattedMessage = this.formatGroupMessage(messageText.trim(), senderName, senderPhone, isFromGroup);
			return {
				id: webhook.idMessage,
				entityType: "CONTACT",
				entityId: 0,
				message: formattedMessage,
				direction: "inbound",
				attachments: attachments.length > 0 ? attachments : undefined,
				phone: conversationId,
				portalDomain: "",
				senderName: conversationName,
			};
		}

		if (webhook.typeWebhook === "incomingCall") {
			const callerPhone = webhook.from?.replace("@c.us", "") || "unknown";
			const callStatus = webhook.status;

			switch (callStatus) {
				case "offer":
					messageText = `📞 Incoming call from ${callerPhone}`;
					break;
				case "pickUp":
					messageText = `📞 Call answered from ${callerPhone}`;
					break;
				case "hangUp":
					messageText = `📞 Call ended by recipient - ${callerPhone}`;
					break;
				case "missed":
					messageText = `📞 Missed call from ${callerPhone}`;
					break;
				case "declined":
					messageText = `📞 Call declined from ${callerPhone}`;
					break;
				default:
					messageText = `📞 Call event from ${callerPhone} - Status: ${callStatus}`;
			}

			return {
				id: webhook.idMessage || `call_${Date.now()}`,
				entityType: "CONTACT",
				entityId: 0,
				message: messageText,
				direction: "inbound",
				phone: callerPhone,
				portalDomain: "",
				senderName: `WhatsApp ${callerPhone}`,
			};
		}

		throw new Error(`Unsupported GREEN-API webhook type: ${webhook.typeWebhook}`);
	}

	private formatQuotedMessage(quotedMessage: QuotedMessage): string {
		const sender = quotedMessage.participant?.replace("@c.us", "") || "Unknown";
		let quotedText: string;

		switch (quotedMessage.typeMessage) {
			case "textMessage":
			case "extendedTextMessage":
				quotedText = quotedMessage.textMessage || "";
				break;
			case "imageMessage":
			case "videoMessage":
			case "documentMessage":
			case "audioMessage":
			case "stickerMessage":
				quotedText = quotedMessage.caption || `[${quotedMessage.typeMessage.replace("Message", "")}]`;
				break;
			case "locationMessage":
				quotedText = "[Location]";
				break;
			case "contactMessage":
				quotedText = "[Contact]";
				break;
			default:
				quotedText = `[${quotedMessage.typeMessage || "Message"}]`;
		}

		return `> ${quotedText}\n> From: ${sender}`;
	}

	toGreenApiMessage(bitrixWebhook: Bitrix24WebhookDto): Message {
		this.logger.debug(`Transforming Bitrix24 webhook to GREEN-API message: ${JSON.stringify(bitrixWebhook)}`);

		if (bitrixWebhook.event?.toUpperCase() === "ONIMCONNECTORMESSAGEADD") {
			if (!bitrixWebhook.data) {
				throw new Error("Missing webhook data");
			}

			let messageText = "";
			let phone = "";
			let files: BitrixFileDto[] = [];

			if (bitrixWebhook.data.MESSAGES && Array.isArray(bitrixWebhook.data.MESSAGES) && bitrixWebhook.data.MESSAGES.length > 0) {
				const message = bitrixWebhook.data.MESSAGES[0];
				messageText = message.message?.text || "";
				files = message.message?.files || [];

				messageText = messageText.replace(/\[b][^:]+:\[\/b]\s+\[br]/i, "");
				messageText = messageText.replace(/\[b][^:]+:\[\/b]\[br]/i, "");
				messageText = messageText.replace(/\[b][^:]+@[^:]+:\[\/b]\s*\[br]/i, "");
				messageText = messageText.replace(/^\[b][^:]+:\[\/b]\s*/i, "");
				messageText = messageText
					.replace(/\[b]/g, "**")
					.replace(/\[\/b]/g, "**")
					.replace(/\[br]/g, "\n")
					.replace(/\[i]/g, "*")
					.replace(/\[\/i]/g, "*")
					.replace(/\[u]/g, "_")
					.replace(/\[\/u]/g, "_")
					.trim();

				phone = message.chat?.id || "";

				this.logger.info(`Extracted from MESSAGES format:`, {
					originalText: message.message?.text,
					cleanedText: messageText,
					phone,
					files: files.length,
				});
			} else if (bitrixWebhook.data.FIELDS) {
				const fields = bitrixWebhook.data.FIELDS;
				messageText = fields.MESSAGE || fields.COMMENT || "";
				phone = fields.PHONE || fields.CHAT_ID || fields.DIALOG_ID || "";

				if (!phone && fields.CHAT_ID) {
					const chatId = fields.CHAT_ID.toString();
					const phoneMatch = chatId.match(/(\d{10,15})/);
					if (phoneMatch) {
						phone = phoneMatch[1];
					}
				}

				this.logger.info(`Extracted from FIELDS format:`, {
					messageText,
					phone,
					fields,
				});
			} else {
				this.logger.error("Webhook data structure:", bitrixWebhook.data);
				throw new Error("Missing webhook MESSAGES or FIELDS data");
			}

			if (!phone) {
				this.logger.error("No phone number found in webhook data:", {
					data: bitrixWebhook.data,
					extractedPhone: phone,
				});
				throw new Error("No phone number found in webhook data");
			}

			let chatId: string;

			if (/^\d{15,}$/.test(phone)) {
				chatId = `${phone}@g.us`;
				this.logger.info(`Sending message to group chat: ${chatId}`);
			} else {
				const cleanPhone = phone.replace(/\D/g, "");
				if (cleanPhone.length < 10) {
					throw new Error(`Invalid phone number format: ${phone} (cleaned: ${cleanPhone})`);
				}
				chatId = formatPhoneNumber(cleanPhone);
				this.logger.info(`Sending message to individual chat: ${chatId} (original: ${phone})`);
			}

			if (files.length > 0) {
				const file = files[0];
				this.logger.info(`Sending file "${file.name}" to ${chatId}`);

				return {
					type: "url-file",
					chatId,
					file: {
						url: file.link || "",
						fileName: file.name || `file_${Date.now()}`,
					},
				};
			}

			if (messageText) {
				this.logger.info(`Sending message "${messageText}" to ${chatId}`);
				return {
					type: "text",
					chatId,
					message: messageText,
				};
			}

			throw new Error("No message text or files found in webhook");
		}

		throw new Error(`Unsupported Bitrix24 webhook event: ${bitrixWebhook.event}`);
	}
}