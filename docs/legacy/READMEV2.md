# Data-Encryption/Decryption-Visualiser
COMP1004 SPA project

## Project Vision
This project is important in the real world to provide an educational and interactive platform that demonstartes the processes behind popular encryption algorithms, allowing for a better understanding of cryptography.

### Goals:
1. **Simplify Cryptography Concpets:** Present encryption techniques in a visual way to make them usable for non experts.
2. **Interactive Simulations:** Allow users to input their own data (e.g. text) and see step by step transformations as it gets encrypted or decrypted.
3. **Educational Value:** Provide real time explanations, annotations, and tooltips to ensure users understand each stage of the encryption process.
4. **Lightweight and Accesible:** Create an SPA that works seamlessly across modern browsers without the need for additional frameworks or libraries.

### Target Audience
* **Students:** Learning about cryptography and computer science.
* **Educators:** Teachers looking for an engaging tool to explain encryption concepts.
* **Enthusiasts:** Anyone interested in understanding the mechanics of data encryption.

### Core Features
1. **Algorithm Visualisation**
   * Supported Algorithms:
     * Caesar Cipher
     * Vigenere Cipher
     * RSA (simplified)
     * AES (Conceptual Overview)
     * Substitution Cipher
   * **Dynamic Animations:** Visualise important processes like key generation, substitution, permutation, and modular arithmetic.

2. **User Interaction**
   * **Custom Input:** Users can enter their own text or data to encrypt and decrypt.
   * **Step-by-Step Process:** Breakdown of each stage in the algorithm with specific visuals.
   * **Adjustable Parameters:** Allow users to tweak algorithm parameters (e.g. shift value for Caesar Cipher).

3. **Educational Annotations**
   * **Inline Explanations:** Highlight important operations with tooltips or side panel notes.
   * **Error Feedback:** Notify users when input data doesn't meet algorithm requirements.

4. **Responsive Design**
   * **Optimised Layouts:** Ensure usability across devices (desktop, tablet, mobile).
   * **Interactive Canvas:** Utilise scalable and responsive elements.
  
### Technical Specifications
**Development tools:**
* **HTML:** Structure and layout.
* **CSS:** Styling, animations, and responsive design.
* **JavaScript:**
  * DOM manipulation for interactivity.
  * Canvas API for dynamic visualisations.

### Performance Goals:
* Fast load times and smooth animations
* Compatibility with modern browsers (Chrome, Firefox, Edge, Safari)

### Future Considerations (If project were to be continued)
* **Advanced Algorthms:** Expand to include more complex encryption techniques (e.g. Elliptic Curve Cryptography).
* **Collaboration Tools:** Allow users to share their encryption visualisations in real time.
* **Integration with Frameworks:** Evaluate the need for React or similar frameworks if the project scales.
