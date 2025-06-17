import { All, Controller, Req, Res } from "@nestjs/common";
import { Response, Request } from "express";

@Controller()
export class AppController {
	private getTranslations(language: string) {
		const isRussian = language === "ru";

		return {
			title: isRussian ? "GREEN-API WhatsApp Интеграция" : "GREEN-API WhatsApp Integration",
			header: {
				title: isRussian ? "GREEN-API WhatsApp" : "GREEN-API WhatsApp",
				subtitle: isRussian ? "Профессиональная WhatsApp интеграция для Bitrix24" : "Professional WhatsApp Integration for Bitrix24",
				status: isRussian ? "✅ Приложение успешно установлено и активно" : "✅ Successfully Installed & Active",
			},
			quickActions: {
				configure: {
					title: isRussian ? "Настроить коннектор" : "Configure Connector",
					description: isRussian ? "Настройте ваш GREEN-API WhatsApp коннектор в Контакт-центре" : "Set up your GREEN-API WhatsApp connector in Contact Center",
				},
				documentation: {
					title: isRussian ? "Документация" : "Documentation",
					description: isRussian ? "Узнайте, как максимально эффективно использовать WhatsApp интеграцию" : "Learn how to get the most out of your WhatsApp integration",
					url: isRussian ? "https://green-api.com/docs/integration" : "https://green-api.com/en/docs/integration",
				},
			},
			tutorial: {
				title: isRussian ? "Быстрое руководство по настройке" : "Quick Setup Guide",
				subtitle: isRussian ? "Следуйте этим простым шагам, чтобы начать получать WhatsApp сообщения" : "Follow these simple steps to start receiving WhatsApp messages",
				steps: [
					{
						title: isRussian ? "Шаг 1: Откройте Контакт-центр" : "Step 1: Open Contact Center",
						description: isRussian ? "Перейдите в Контакт-центр в меню вашего Bitrix24. Здесь управляются все каналы связи с клиентами." : "Navigate to Contact Center in your Bitrix24 menu. This is where all your customer communication channels are managed.",
						button: isRussian ? "Открыть Контакт-центр →" : "Open Contact Center →",
						imageLabel: isRussian ? "Панель Контакт-центра" : "Contact Center Dashboard",
						image: isRussian ? "/images/step1-contact-center-ru.png" : "/images/step1-contact-center.png",
					},
					{
						title: isRussian ? "Шаг 2: Найдите GREEN-API коннектор" : "Step 2: Find GREEN-API Connector",
						description: isRussian ? "Найдите GREEN-API WhatsApp коннектор в списке доступных коннекторов. Он должен отображаться как установленный и готовый к настройке." : "Look for the GREEN-API WhatsApp connector in your available connectors list. It should show as installed and ready to configure.",
						button: isRussian ? "Перейти к коннектору →" : "Go to Connector →",
						imageLabel: isRussian ? "GREEN-API Коннектор" : "GREEN-API Connector",
						image: isRussian ? "/images/step2-connector-ru.png" : "/images/step2-connector.png",
					},
					{
						title: isRussian ? "Шаг 3: Настройте параметры" : "Step 3: Configure Settings",
						description: isRussian ? "Введите ваш GREEN-API Instance ID и API Token из аккаунта console.green-api.com." : "Enter your GREEN-API Instance ID and API Token from your console.green-api.com account.",
						button: isRussian ? "Получить учетные данные →" : "Get Credentials →",
						imageLabel: isRussian ? "Панель конфигурации" : "Configuration Panel",
						image: isRussian ? "/images/step3-configuration-ru.png" : "/images/step3-configuration.png",
					},
					{
						title: isRussian ? "Шаг 4: Тестирование и начало общения" : "Step 4: Test & Start Chatting",
						description: isRussian ? "Отправьте тестовое сообщение на номер, подключенный к вашему инстансу, чтобы проверить соединение. После этого ваша команда сможет получать и отвечать на WhatsApp сообщения прямо из Bitrix24!" : "Send a test message to the number you connected to your instance to verify the connection. Once working, your team can receive and respond to WhatsApp messages directly in Bitrix24!",
						successMessage: isRussian ? "✅ Вы готовы к работе!" : "✅ You're all set!",
						successDescription: isRussian ? "WhatsApp сообщения теперь будут появляться в вашем Контакт-центре." : "WhatsApp messages will now appear in your Contact Center.",
					},
				],
			},
		};
	}

	@All()
	getRoot(@Req() req: Request, @Res() res: Response) {
		res.setHeader("X-Frame-Options", "ALLOWALL");
		res.setHeader("Content-Security-Policy", "frame-ancestors *");
		res.setHeader("Access-Control-Allow-Origin", "*");

		if (req.method === "HEAD") {
			return res.status(200).send();
		}

		const languageId = req.query.LANG as string || req.body?.LANG || "en";
		const t = this.getTranslations(languageId);

		const html = `<!DOCTYPE html>
        <html lang="${languageId === "ru" ? "ru" : "en"}">
        <head>
            <title>${t.title}</title>
            <script src="//api.bitrix24.com/api/v1/"></script>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                }
                
                .container {
                    max-width: 900px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                    animation: slideUp 0.6s ease-out;
                }
                
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                .header {
                    background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                    color: white;
                    padding: 40px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }
                
                .header::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
                    animation: float 20s linear infinite;
                }
                
                @keyframes float {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
                
                .logo {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 20px;
                    background: rgba(255,255,255,0.9);
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                    position: relative;
                    z-index: 2;
                    padding: 10px;
                }
                
                .logo svg {
                    width: 60px;
                    height: auto;
                }
                
                .header h1 {
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin-bottom: 10px;
                    position: relative;
                    z-index: 2;
                }
                
                .header p {
                    font-size: 1.1rem;
                    opacity: 0.9;
                    position: relative;
                    z-index: 2;
                }
                
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    background: rgba(255,255,255,0.2);
                    padding: 8px 16px;
                    border-radius: 50px;
                    margin-top: 20px;
                    backdrop-filter: blur(10px);
                    position: relative;
                    z-index: 2;
                }
                
                .content {
                    padding: 40px;
                }
                
                .quick-actions {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 40px;
                }
                
                .action-card {
                    background: linear-gradient(135deg, #f8f9ff 0%, #e8f4fd 100%);
                    border: 2px solid #e0e7ff;
                    border-radius: 16px;
                    padding: 24px;
                    text-align: center;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    text-decoration: none;
                    color: inherit;
                }
                
                .action-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 35px rgba(0,0,0,0.1);
                    border-color: #25D366;
                    text-decoration: none;
                    color: inherit;
                }
                
                .action-card-icon {
                    width: 48px;
                    height: 48px;
                    background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 16px;
                    font-size: 24px;
                    color: white;
                }
                
                .action-card h3 {
                    font-size: 1.2rem;
                    margin-bottom: 8px;
                    color: #333;
                }
                
                .action-card p {
                    color: #666;
                    font-size: 0.9rem;
                    line-height: 1.4;
                }
                
                .tutorial-section {
                    background: #f8f9fa;
                    border-radius: 16px;
                    padding: 30px;
                    margin-top: 30px;
                }
                
                .tutorial-header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                
                .tutorial-header h2 {
                    font-size: 1.8rem;
                    color: #333;
                    margin-bottom: 10px;
                }
                
                .tutorial-slider {
                    position: relative;
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }
                
                .slides {
                    display: flex;
                    transition: transform 0.5s ease;
                }
                
                .slide {
                    min-width: 100%;
                    padding: 30px;
                    display: flex;
                    align-items: center;
                    gap: 30px;
                }
                
                .slide-content {
                    flex: 1;
                }
                
                .slide-image {
                    flex: 1;
                    background: white;
                    border-radius: 12px;
                    min-height: 300px;
                    max-height: 350px;
                    position: relative;
                    overflow: hidden;
                    border: 2px solid #e0e0e0;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 10px;
                }
                
                .slide-image:hover {
                    border-color: #25D366;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                    transform: translateY(-2px);
                }
                
                .slide-image img {
                    max-width: 100%;
                    max-height: 100%;
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    border-radius: 8px;
                    transition: transform 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
                
                .slide-image:hover img {
                    transform: scale(1.03);
                }
                
                .slide-image .image-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 3rem;
                    color: #ccc;
                    background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
                }
                
                .slide-image .step-badge {
                    position: absolute;
                    top: 15px;
                    left: 15px;
                    background: #25D366;
                    color: white;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.9rem;
                    font-weight: bold;
                    z-index: 2;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }
                
                .slide-image .image-label {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0,0,0,0.7));
                    color: white;
                    padding: 20px 15px 15px;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                
                .slide-image .loading-spinner {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 40px;
                    height: 40px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #25D366;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    display: none;
                }
                
                @keyframes spin {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
                
                /* Modal Styles */
                .image-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 20px;
                    box-sizing: border-box;
                }
                
                .image-modal.active {
                    display: flex;
                }
                
                .modal-content {
                    position: relative;
                    max-width: 90%;
                    max-height: 90%;
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: modalSlideIn 0.3s ease-out;
                }
                
                @keyframes modalSlideIn {
                    from { 
                        opacity: 0; 
                        transform: scale(0.8) translateY(30px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: scale(1) translateY(0); 
                    }
                }
                
                .modal-image {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    display: block;
                    max-height: 80vh;
                }
                
                .modal-close {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: rgba(0,0,0,0.7);
                    color: white;
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    z-index: 1;
                }
                
                .modal-close:hover {
                    background: rgba(0,0,0,0.9);
                    transform: scale(1.1);
                }
                
                .modal-caption {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0,0,0,0.8));
                    color: white;
                    padding: 30px 20px 15px;
                    font-size: 1rem;
                    font-weight: 500;
                }
                
                .slide h3 {
                    font-size: 1.5rem;
                    color: #333;
                    margin-bottom: 15px;
                }
                
                .slide p {
                    color: #666;
                    line-height: 1.6;
                    margin-bottom: 20px;
                }
                
                .slide-nav {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                    gap: 15px;
                    background: #f8f9fa;
                }
                
                .nav-btn {
                    background: #25D366;
                    color: white;
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    font-size: 18px;
                }
                
                .nav-btn:hover {
                    background: #128C7E;
                    transform: scale(1.1);
                }
                
                .nav-btn:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .dots {
                    display: flex;
                    gap: 8px;
                }
                
                .dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #ddd;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .dot.active {
                    background: #25D366;
                    transform: scale(1.2);
                }
                
                .primary-btn {
                    background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                }
                
                .primary-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(37, 211, 102, 0.3);
                    text-decoration: none;
                    color: white;
                }
                
                .success-box {
                    background: #e8f5e8; 
                    padding: 15px; 
                    border-radius: 8px; 
                    margin-top: 15px;
                }
                
                @media (max-width: 768px) {
                    .quick-actions {
                        grid-template-columns: 1fr;
                    }
                    
                    .slide {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .slide-image {
                        min-height: 200px;
                    }
                    
                    .header h1 {
                        font-size: 2rem;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">
                        <svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="419px" height="500px" version="1.1" style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd" viewBox="0 0 17.944 21.415" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xodm="http://www.corel.com/coreldraw/odm/2003">
                            <defs>
                                <style type="text/css">
                                    <![CDATA[
                                        .fil0 {fill:white}
                                        .fil1 {fill:#3B9702;fill-rule:nonzero}
                                    ]]>
                                </style>
                            </defs>
                            <g id="Слой_x0020_1">
                                <metadata id="CorelCorpID_0Corel-Layer"/>
                                <g id="_2048674437840">
                                    <path class="fil0" d="M11.821 10.924l-2.624 0 0 -2.099 5.117 0c0.021,0.114 0.036,0.269 0.047,0.466 0.01,0.197 0.018,0.386 0.023,0.568 0.005,0.181 0.008,0.324 0.008,0.427 0,0.705 -0.127,1.351 -0.381,1.937 -0.254,0.586 -0.612,1.091 -1.073,1.516 -0.462,0.425 -1.003,0.754 -1.626,0.988 -0.622,0.233 -1.296,0.35 -2.021,0.35 -0.871,0 -1.657,-0.14 -2.357,-0.42 -0.7,-0.28 -1.303,-0.674 -1.812,-1.182 -0.508,-0.508 -0.896,-1.104 -1.166,-1.789 -0.27,-0.684 -0.404,-1.431 -0.404,-2.239 0,-0.809 0.145,-1.556 0.435,-2.24 0.29,-0.684 0.697,-1.281 1.221,-1.789 0.524,-0.508 1.146,-0.902 1.866,-1.182 0.721,-0.28 1.511,-0.42 2.372,-0.42 0.591,0 1.154,0.078 1.688,0.234 0.534,0.155 1.021,0.368 1.462,0.637 0.44,0.27 0.806,0.576 1.096,0.918l-1.633 1.711c-0.373,-0.353 -0.775,-0.63 -1.205,-0.832 -0.431,-0.202 -0.915,-0.304 -1.454,-0.304 -0.446,0 -0.858,0.081 -1.237,0.242 -0.378,0.16 -0.71,0.388 -0.995,0.684 -0.286,0.295 -0.506,0.643 -0.661,1.042 -0.156,0.399 -0.234,0.832 -0.234,1.299 0,0.466 0.083,0.896 0.249,1.29 0.166,0.394 0.397,0.739 0.692,1.035 0.296,0.295 0.641,0.526 1.035,0.692 0.394,0.166 0.819,0.249 1.275,0.249 0.321,0 0.619,-0.05 0.894,-0.148 0.275,-0.099 0.519,-0.233 0.731,-0.404 0.213,-0.172 0.379,-0.374 0.498,-0.607 0.101,-0.197 0.159,-0.407 0.174,-0.63z"/>
                                    <path class="fil1" d="M1.761 0.001c-0.442,0.009 -0.877,0.19 -1.197,0.498 -0.332,0.316 -0.537,0.763 -0.561,1.224 -0.006,0.201 -0.001,0.403 -0.003,0.605 0.001,5.745 0,11.49 0.001,17.234 0.006,0.444 0.163,0.881 0.425,1.235 0.203,0.272 0.482,0.5 0.813,0.584 0.21,0.055 0.435,0.041 0.639,-0.03 4.775,-1.461 9.549,-2.922 14.323,-4.383 0.402,-0.128 0.8,-0.297 1.131,-0.565 0.254,-0.205 0.459,-0.48 0.549,-0.798 0.054,-0.179 0.066,-0.368 0.062,-0.555 -0.001,-4.417 0,-8.834 -0.001,-13.251 -0.004,-0.453 -0.183,-0.901 -0.492,-1.228 -0.312,-0.337 -0.755,-0.544 -1.21,-0.568 -0.2,-0.006 -0.399,-0.001 -0.599,-0.003 -4.619,0.001 -9.239,0 -13.858,0.001 -0.007,0 -0.015,0 -0.022,0l0 0zm10.06 10.923l-2.624 0 0 -2.099 5.117 0c0.021,0.114 0.036,0.269 0.047,0.466 0.01,0.197 0.018,0.386 0.023,0.568 0.005,0.181 0.008,0.324 0.008,0.427 0,0.705 -0.127,1.351 -0.381,1.937 -0.254,0.586 -0.612,1.091 -1.073,1.516 -0.462,0.425 -1.003,0.754 -1.626,0.988 -0.622,0.233 -1.296,0.35 -2.021,0.35 -0.871,0 -1.657,-0.14 -2.357,-0.42 -0.7,-0.28 -1.303,-0.674 -1.812,-1.182 -0.508,-0.508 -0.896,-1.104 -1.166,-1.789 -0.27,-0.684 -0.404,-1.431 -0.404,-2.239 0,-0.809 0.145,-1.556 0.435,-2.24 0.29,-0.684 0.697,-1.281 1.221,-1.789 0.524,-0.508 1.146,-0.902 1.866,-1.182 0.721,-0.28 1.511,-0.42 2.372,-0.42 0.591,0 1.154,0.078 1.688,0.234 0.534,0.155 1.021,0.368 1.462,0.637 0.44,0.27 0.806,0.576 1.096,0.918l-1.633 1.711c-0.373,-0.353 -0.775,-0.63 -1.205,-0.832 -0.431,-0.202 -0.915,-0.304 -1.454,-0.304 -0.446,0 -0.858,0.081 -1.237,0.242 -0.378,0.16 -0.71,0.388 -0.995,0.684 -0.286,0.295 -0.506,0.643 -0.661,1.042 -0.156,0.399 -0.234,0.832 -0.234,1.299 0,0.466 0.083,0.896 0.249,1.29 0.166,0.394 0.397,0.739 0.692,1.035 0.296,0.295 0.641,0.526 1.035,0.692 0.394,0.166 0.819,0.249 1.275,0.249 0.321,0 0.619,-0.05 0.894,-0.148 0.275,-0.099 0.519,-0.233 0.731,-0.404 0.213,-0.172 0.379,-0.374 0.498,-0.607 0.101,-0.197 0.159,-0.407 0.174,-0.63l0 0z"/>
                                </g>
                            </g>
                        </svg>
                    </div>
                    <h1>${t.header.title}</h1>
                    <p>${t.header.subtitle}</p>
                    <div class="status-badge">
                        <span>${t.header.status}</span>
                    </div>
                </div>
                
                <div class="content">
                    <div class="quick-actions">
                        <a href="#" onclick="openConnector(); return false;" class="action-card">
                            <div class="action-card-icon">⚙️</div>
                            <h3>${t.quickActions.configure.title}</h3>
                            <p>${t.quickActions.configure.description}</p>
                        </a>
                        
                        <a href="${t.quickActions.documentation.url}" class="action-card" target="_blank">
                            <div class="action-card-icon">📚</div>
                            <h3>${t.quickActions.documentation.title}</h3>
                            <p>${t.quickActions.documentation.description}</p>
                        </a>
                    </div>
                    
                    <div class="tutorial-section">
                        <div class="tutorial-header">
                            <h2>${t.tutorial.title}</h2>
                            <p>${t.tutorial.subtitle}</p>
                        </div>
                        
                        <div class="tutorial-slider">
                            <div class="slides" id="slides">
                                ${t.tutorial.steps.map((step, index) => `
                                <div class="slide">
                                    <div class="slide-content" ${index === 3 ? "style=\"flex: 1; text-align: center; max-width: 600px; margin: 0 auto;\"" : ""}>
                                        <h3>${step.title}</h3>
                                        <p>${step.description}</p>
                                        ${index === 3 ? `
                                        <div class="success-box">
                                            <strong>${step.successMessage}</strong><br>
                                            ${step.successDescription}
                                        </div>
                                        ` : `
                                        <a href="${index === 2 ? "https://console.green-api.com" : "#"}" ${index === 2 ? "target=\"_blank\"" : `onclick="${index === 0 ? "openContactCenter" : "openConnector"}(); return false;"`} class="primary-btn">
                                            ${step.button}
                                        </a>
                                        `}
                                    </div>
                                    ${index !== 3 ? `
                                    <div class="slide-image" onclick="openImageModal(${index})">
                                        <div class="step-badge">${index + 1}</div>
                                        <div class="loading-spinner" id="loading-${index}"></div>
                                        <img 
                                            src="${step.image}" 
                                            alt="${step.imageLabel}"
                                            onload="hideLoading(${index})"
                                            onerror="showPlaceholder(${index}, '${["🏢", "📱", "🔧", "💬"][index]}')"
                                            style="display: none;"
                                            id="image-${index}"
                                        />
                                        <div class="image-placeholder" id="placeholder-${index}" style="display: flex;">
                                            ${["🏢", "📱", "🔧", "💬"][index]}
                                        </div>
                                        <div class="image-label">${step.imageLabel}</div>
                                    </div>
                                    ` : ""}
                                </div>
                                `).join("")}
                            </div>
                            
                            <div class="slide-nav">
                                <button class="nav-btn" onclick="prevSlide()" id="prevBtn">‹</button>
                                <div class="dots" id="dots"></div>
                                <button class="nav-btn" onclick="nextSlide()" id="nextBtn">›</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Image Modal -->
            <div class="image-modal" id="imageModal" onclick="closeImageModal(event)">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <button class="modal-close" onclick="closeImageModal()">&times;</button>
                    <img class="modal-image" id="modalImage" src="" alt="">
                    <div class="modal-caption" id="modalCaption"></div>
                </div>
            </div>
            
            <script>
                let currentSlide = 0;
                const totalSlides = 4;
                let domain = '';
                
                function openImageModal(index) {
                    const image = document.getElementById(\`image-\${index}\`);
                    const placeholder = document.getElementById(\`placeholder-\${index}\`);
                    const modal = document.getElementById('imageModal');
                    const modalImage = document.getElementById('modalImage');
                    const modalCaption = document.getElementById('modalCaption');
                    
                    if (image && image.style.display !== 'none') {
                        modalImage.src = image.src;
                        modalImage.alt = image.alt;
                        modalCaption.textContent = image.alt;
                        modal.classList.add('active');
                        document.body.style.overflow = 'hidden';
                    }
                }
                
                function closeImageModal(event) {
                    if (event && event.target !== event.currentTarget && !event.target.classList.contains('modal-close')) {
                        return;
                    }
                    
                    const modal = document.getElementById('imageModal');
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
                
                document.addEventListener('keydown', function(event) {
                    if (event.key === 'Escape') {
                        closeImageModal();
                    }
                });
                
                function hideLoading(index) {
                    const loading = document.getElementById(\`loading-\${index}\`);
                    const image = document.getElementById(\`image-\${index}\`);
                    const placeholder = document.getElementById(\`placeholder-\${index}\`);
                    
                    if (loading) loading.style.display = 'none';
                    if (image) image.style.display = 'block';
                    if (placeholder) placeholder.style.display = 'none';
                }
                
                function showPlaceholder(index, emoji) {
                    const loading = document.getElementById(\`loading-\${index}\`);
                    const image = document.getElementById(\`image-\${index}\`);
                    const placeholder = document.getElementById(\`placeholder-\${index}\`);
                    
                    if (loading) loading.style.display = 'none';
                    if (image) image.style.display = 'none';
                    if (placeholder) {
                        placeholder.style.display = 'flex';
                        placeholder.innerHTML = emoji;
                    }
                }
                
                function initSlider() {
                    const dotsContainer = document.getElementById('dots');
                    for (let i = 0; i < totalSlides; i++) {
                        const dot = document.createElement('div');
                        dot.className = 'dot' + (i === 0 ? ' active' : '');
                        dot.onclick = () => goToSlide(i);
                        dotsContainer.appendChild(dot);
                    }
                    
                    for (let i = 0; i < 3; i++) {
                        const loading = document.getElementById(\`loading-\${i}\`);
                        if (loading) loading.style.display = 'block';
                        
                        const image = document.getElementById(\`image-\${i}\`);
                        if (image && image.src) {
                            const newImg = new Image();
                            newImg.onload = () => hideLoading(i);
                            newImg.onerror = () => showPlaceholder(i, ['🏢', '📱', '🔧'][i]);
                            newImg.src = image.src;
                        }
                    }
                    
                    updateNav();
                }
                
                function goToSlide(n) {
                    currentSlide = n;
                    const slides = document.getElementById('slides');
                    slides.style.transform = \`translateX(-\${n * 100}%)\`;
                    
                    document.querySelectorAll('.dot').forEach((dot, i) => {
                        dot.classList.toggle('active', i === n);
                    });
                    
                    updateNav();
                }
                
                function nextSlide() {
                    if (currentSlide < totalSlides - 1) {
                        goToSlide(currentSlide + 1);
                    }
                }
                
                function prevSlide() {
                    if (currentSlide > 0) {
                        goToSlide(currentSlide - 1);
                    }
                }
                
                function updateNav() {
                    document.getElementById('prevBtn').disabled = currentSlide === 0;
                    document.getElementById('nextBtn').disabled = currentSlide === totalSlides - 1;
                }
                
                function openContactCenter() {
                    if (typeof BX24 !== 'undefined' && domain) {
                        window.top.location.href = \`https://\${domain}/contact_center/\`;
                    }
                }
                
                function openConnector() {
                    if (typeof BX24 !== 'undefined' && domain) {
                        window.top.location.href = \`https://\${domain}/contact_center/connector/?ID=greenapi_whatsapp\`;
                    }
                }
                
                if (typeof BX24 !== 'undefined') {
                    BX24.init(() => {
                        console.log('GREEN-API app interface loaded');
                        domain = BX24.getDomain();
                        console.log('Current domain:', domain);
                    });
                } else {
                    console.warn('BX24 not available, running in standalone mode');
                }
                
                document.addEventListener('DOMContentLoaded', initSlider);
            </script>
        </body>
        </html>`;

		res.send(html);
	}
}