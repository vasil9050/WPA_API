const request = require('request');
const PDFDocument = require('pdfkit');
const fs = require('fs');

module.exports = class EcommerceStore {
  constructor() {}
  async _fetchAssistant(endpoint, body) {
    return new Promise((resolve, reject) => {
      request.post(
        {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          url: `https://tectronicsindia.com/api${endpoint ? endpoint : '/'}`,
          body: JSON.stringify(body),
        },
        (error, res, body) => {
          try {
            if (error) {
              console.log('Error', error);
              reject(error);
            } else {
              console.log('Success', body);
              resolve({
                status: 'success',
                data: JSON.parse(body),
              });
            }
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  async _fetchAssistantGet(endpoint, body) {
    return new Promise((resolve, reject) => {
    console.log(body);
      request.get(
        {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          url: `https://tectronicsindia.com/api${endpoint ? endpoint : '/'}`,
          body: JSON.stringify(body),
        },
        (error, res, body) => {
          try {
            if (error) {
              console.log('Error', error);
              reject(error);
            } else {
            console.log('Success', body);
              resolve({
                status: 'success',
                data: JSON.parse(body),
              });
            }
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  async getProductById(productId) {
    return await this._fetchAssistant(`/products/${productId}`);
  }
  async getAllCategories() {
    return await this._fetchAssistant('/Product/GetWACategories');
  }
  async getAllProductsByCategories(CategoryId) {
    let body = {
      CategoryId: CategoryId,
    };
    console.log(body);
    return await this._fetchAssistantGet('/Product/GetWAProductsByCategory/', body);
  }
  async getProductDetailsByProduct(ProductId) {
    let body = {
      ProductId: ProductId,
    };
    console.log(body);
    return await this._fetchAssistant('/Product/GetWAProductDetailsByProduct/', body);
  }

  async GetProductPDF(ProductId, SpecificationId) {
    let body = {
      ProductId: ProductId,
      SpecificationId: SpecificationId
    };
    console.log(body);
    return await this._fetchAssistant('/Product/GetProductPDF', body);
  }


  async getProductsInCategory(categoryId) {
    return await this._fetchAssistant(`/products/category/${categoryId}?limit=10`);
  }

  generatePDFInvoice({ order_details, file_path }) {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(file_path));
    doc.fontSize(25);
    doc.text(order_details, 100, 100);
    doc.end();
    return;
  }

  generateRandomGeoLocation() {
    let storeLocations = [
      {
        latitude: 44.985613,
        longitude: 20.1568773,
        address: 'New Castle',
      },
      {
        latitude: 36.929749,
        longitude: 98.480195,
        address: 'Glacier Hill',
      },
      {
        latitude: 28.91667,
        longitude: 30.85,
        address: 'Buena Vista',
      },
    ];
    return storeLocations[Math.floor(Math.random() * storeLocations.length)];
  }
};
