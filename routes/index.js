'use strict';
const router = require('express').Router();
const fetch = require('node-fetch');

const WhatsappCloudAPI = require('whatsappcloudapi_wrapper');
// const WhatsappAPI = require('whatsapp-business-api');
const Whatsapp = new WhatsappCloudAPI({
  accessToken: process.env.Meta_WA_accessToken,
  senderPhoneNumberId: process.env.Meta_WA_SenderPhoneNumberId,
  WABA_ID: process.env.Meta_WA_wabaId,
  graphAPIVersion: 'v14.0',
});

const botId = process.env.Meta_WA_SenderPhoneNumberId;
const bearerToken = process.env.Meta_WA_accessToken;

// const wp = new WhatsappAPI({
//   accountPhoneNumberId: process.env.Meta_WA_SenderPhoneNumberId, // required
//   accessToken: process.env.Meta_WA_accessToken, // required
// });

const EcommerceStore = require('./../utils/ecommerce_store.js');
let Store = new EcommerceStore();
let count = 0;
let optLst = [];
let flag = 0;
let pdf = 0;
const CustomerSession = new Map();

router.get('/meta_wa_callbackurl', (req, res) => {
  try {
    console.log('GET: Someone is pinging me!');

    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token && mode === 'subscribe' && process.env.Meta_WA_VerifyToken === token) {
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  } catch (error) {
    console.error({ error });
    return res.sendStatus(500);
  }
});

router.post('/meta_wa_callbackurl', async (req, res) => {
  try {
    let data = Whatsapp.parseMessage(req.body);

    const callButtonMessage = {
      type: 'template',
      template: {
        name: 'call_action',
        language: {
          code: 'en_US',
          policy: 'deterministic',
        },
        components: [
          {
            type: 'button',
            sub_type: 'quick_reply',
            index: 1,
          },
        ],
      },
    };

    if (data?.isMessage) {
      let incomingMessage = data.message;
      let recipientPhone = incomingMessage.from.phone; // extract the phone number of sender
      let recipientName = incomingMessage.from.name;
      let typeOfMsg = incomingMessage.type; // extract the type of message (some are text, others are images, others are responses to buttons etc...)
      let message_id = incomingMessage.message_id; // extract the message id

      let phoneNbr = incomingMessage.from.phone;
      var url = ' https://graph.facebook.com/v17.0/' + botId + '/messages';

      let optionsCallButton = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: [phoneNbr],
        ...callButtonMessage,
        //   text: {
        //     body: 'Greeting From Vizz',
        // },
      };

      function optionsButtonPdfSend(recipientPhone, caption, URL) {
        let optionsCallButtonPdfSend = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: [recipientPhone],
          type: 'document',
          document: {
            caption: caption || '',
            link: URL,
            filename: caption || 'document',
          },
        };

        return optionsCallButtonPdfSend;
      }

      async function sendCallButton() {
        const postReq = {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + bearerToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(optionsCallButton),
          json: true,
        };

        fetch(url, postReq)
          .then((data) => {
            return data.json();
          })
          .then((res) => {
            console.log(res);
          })
          .catch((error) => console.log(error));
      }

      async function sendPDF(recipientPhone, caption, URL) {
        const postReq = {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + bearerToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(optionsButtonPdfSend(recipientPhone, caption, URL)),
          json: true,
        };

        fetch(url, postReq)
          .then((data) => {
            return data.json();
          })
          .then((res) => {
            console.log(res);
          })
          .catch((error) => console.log(error));
      }

      function makeUrlFriendly(str) {
        // Replace additional characters to make it URL-friendly
        const urlFriendlyStr = str.replace(/ /g, '%20').replace('http:', 'https:'); // Replace spaces with hyphens

        return urlFriendlyStr;
      }

      if (typeOfMsg === 'text_message' || incomingMessage?.button_reply?.id === 'main_menu') {
        await Whatsapp.sendSimpleButtons({
          message: `Hey ${recipientName}, \nYou are speaking to a chatbot.\nWhat do you want to do next?`,
          recipientPhone: recipientPhone,
          listOfButtons: [
            {
              title: 'Products',
              id: 'see_categories',
            },
            {
              title: 'Documents',
              id: 'print_invoice',
            },
            {
              title: 'Call Us',
              id: 'speak_to_human',
            },
          ],
        });
      }

      if (typeOfMsg === 'simple_button_message') {
        let button_id = incomingMessage.button_reply.id;

        if (button_id === 'see_categories') {
          await Whatsapp.sendSimpleButtons({
            message: `Hey ${recipientName}, \nYou are speaking to a chatbot.\nWhat do you want to do next?`,
            recipientPhone: recipientPhone,
            listOfButtons: [
              {
                title: 'Products Categories',
                id: 'see_products_by_categories',
              },
              {
                title: 'spec wise product',
                id: 'see_products_by_specs',
              },
              {
                title: 'Back to main menu',
                id: 'main_menu',
              },
            ],
          });
        }

        if (button_id === 'see_products_by_categories') {
          let categories = await Store.getAllCategories();
          optLst = [];

          console.log('>>>', categories);

          let listOfSections = [
            {
              title: '>>>',
              rows: categories.data.Result.map((product) => {
                let id = `category1_${product.CategoryId}`;
                let title = product.CategoryName.substring(0, 21);
                let description = `XYZ`.substring(0, 68);

                return {
                  id,
                  title: `${title}`,
                  description: `${title}`,
                };
              }).slice(0, 10),
            },
          ];

          await Whatsapp.sendRadioButtons({
            recipientPhone: recipientPhone,
            headerText: 'Category List',
            bodyText: `Select any Category:`,
            footerText: 'Techtronics',
            listOfSections: listOfSections,
          });
          await Whatsapp.sendSimpleButtons({
            message: 'Go back to main menu',
            recipientPhone: recipientPhone,
            listOfButtons: [
              {
                title: 'Main menu',
                id: 'main_menu',
              },
            ],
          });
        }

        if (button_id === 'speak_to_human') {
          await Whatsapp.sendText({
            recipientPhone: recipientPhone,
            message: `Arguably, chatbots are faster than humans.\nCall my human with the below details:`,
          });

          sendCallButton();
        }
      }

      if (typeOfMsg === 'radio_button_message') {
        let selectionId = incomingMessage.list_reply.id; // the customer clicked and submitted a radio button
        console.log('>>>', incomingMessage.list_reply);

        if (selectionId.startsWith('category1_')) {
          let selectedTitle = incomingMessage.list_reply.title;

          let selectedCategory = incomingMessage.list_reply.title;
          let CategoryId = incomingMessage.list_reply.id.split('_')[1];
          let listOfProducts = await Store.getAllProductsByCategories(CategoryId);

          let listOfSections = [
            {
              title: '>>>',
              rows: listOfProducts.data.Result.map((product) => {
                let id = `category2_${product.ProductId}`;
                let title = product.Name;
                let description = product.Name;
                return {
                  id,
                  title: `${title}`,
                  description: `${description}`,
                };
              }).slice(0, 10),
            },
          ];
          await Whatsapp.sendRadioButtons({
            recipientPhone: recipientPhone,
            headerText: selectedTitle,
            bodyText: `Select any option:`,
            footerText: 'List of sub category',
            listOfSections: listOfSections,
          });
          await Whatsapp.sendSimpleButtons({
            message: 'Go back to main menu',
            recipientPhone: recipientPhone,
            listOfButtons: [
              {
                title: 'Main menu',
                id: 'main_menu',
              },
            ],
          });
        }

        if (selectionId.startsWith('category2_')) {
          try {
            let selectedTitle = incomingMessage.list_reply.title;
            let ProductId = incomingMessage.list_reply.id.split('_')[1];
            // console.log('>>> Category_2', selectedTitle, ProductId);

            let listOfProducts = await Store.getProductDetailsByProduct(ProductId);
            let Result = listOfProducts.data.Result;
            let ResultSpec = Result.Specification;
            let productImg = makeUrlFriendly(Result?.Image);
            let TechnicalImage = makeUrlFriendly(Result?.TechnicalImage);
            let head = Result.Title;

            console.log('>>>', Result);

            let listOfSections = [
              {
                title: '>>>',
                rows: await ResultSpec.map((product) => {
                  let id = `category3_${product.id}_${product.ProductId}`;
                  let title = product.ModelNo;
                  let description = product.ProductName;
                  return {
                    id,
                    title: `${title}`,
                    description: `${description}`,
                  };
                }).slice(0, 10),
              },
            ];
            console.log('>>>', listOfSections[0].rows);
            await Whatsapp.sendRadioButtons({
              recipientPhone: recipientPhone,
              headerText: head,
              bodyText: `Select any option:`,
              footerText: 'List of Models',
              listOfSections: listOfSections,
            });
          } catch (error) {
            console.log('>>>', error);
          }
        }

        if (selectionId.startsWith('category3_')) {
          try {
            console.log('>>> category 3', incomingMessage.list_reply);
            let selectedTitle = incomingMessage.list_reply.title;
            let ProductId = incomingMessage.list_reply.id.split('_')[2];
            let SpecificationId = incomingMessage.list_reply.id.split('_')[1];

            let document = await Store.GetProductPDF(ProductId, SpecificationId);
            let ImgsOfProd = await Store.getProductDetailsByProduct(ProductId);
            let Result = document.data.Result;
            let Result2 = ImgsOfProd.data.Result;
            let productImg = makeUrlFriendly(Result2?.Image);
            let TechnicalImage = makeUrlFriendly(Result2?.TechnicalImage);

            console.log('>>>', Result.Filepath);
            console.log('>>>', productImg);
            console.log('>>>', TechnicalImage);

            await Whatsapp.sendImage({
              recipientPhone,
              url: productImg,
              caption: selectedTitle,
            });

            await Whatsapp.sendImage({
              recipientPhone,
              url: TechnicalImage,
              caption: 'Technical Specifications',
            });

            let caption = 'Technical Specification Document';
            let url = Result.Filepath;

            await sendPDF(recipientPhone, caption, url);

            // Add a small delay (optional, but it helps group the messages)
            await new Promise((resolve) => setTimeout(resolve, 1000));

            await Whatsapp.sendSimpleButtons({
              message: 'Go back to main menu',
              recipientPhone: recipientPhone,
              listOfButtons: [
                {
                  title: 'Main menu',
                  id: 'main_menu',
                },
              ],
            });

            console.log('>>> Image Sent');
          } catch (error) {
            console.log('>>>', error);
          }
        }
      }

      // message read blue tick
      await Whatsapp.markMessageAsRead({
        message_id: message_id,
      });
    }
    console.log('POST: Someone is pinging me!');
    return res.sendStatus(200);
  } catch (error) {
    console.error({ error });
    return res.sendStatus(500);
  }
});
module.exports = router;
