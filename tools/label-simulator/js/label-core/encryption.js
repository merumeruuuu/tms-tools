export class TimelessEncryption {
    constructor(secretKeyString) {
        this.securekey = secretKeyString;
        this.blown_up_key = this.BlowupEncryptionKey();
        this.master_row = this.blown_up_key[0];
    }

    BlowupEncryptionKey() {
        let full_key = [];
        full_key.push(this.securekey.split(''));
        
        let previousKeyArray = full_key[0];
        let fullKey = [];

        for (let outerLoop = 1; outerLoop < previousKeyArray.length; outerLoop++) {
            let nextKeyArray = [];
            let firstElement = previousKeyArray[0];
            for (let innerLoop = 1; innerLoop < previousKeyArray.length; innerLoop++) {
                nextKeyArray.push(previousKeyArray[innerLoop]);
            }
            nextKeyArray.push(firstElement);
            fullKey.push(nextKeyArray); 
            previousKeyArray = nextKeyArray;
        }
        return fullKey;
    }

    encrypt(text_to_encrypt) {
        let encryptedText = '';
        let characters = text_to_encrypt.split('');
        
        let starting_key_index = Math.floor(Math.random() * (this.blown_up_key.length - 1)) + 1;
        let nextKeyIndex = starting_key_index;

        for (let character of characters) {
            if (nextKeyIndex >= this.blown_up_key.length) nextKeyIndex = 1;

            let indexInMasterRow = this.master_row.indexOf(character);

            if (indexInMasterRow === -1) {
                encryptedText += character;
                continue;
            }

            let nextKeyRow = this.blown_up_key[nextKeyIndex];
            let encryptedCharacter = nextKeyRow[indexInMasterRow];
            encryptedText += encryptedCharacter;

            nextKeyIndex += 1;
        }

        return 'D04' + encryptedText + this.master_row[starting_key_index] + '!';
    }
}