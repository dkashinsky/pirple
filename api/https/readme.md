**1. open terminal and make sure your current working directory is 'https' directory where this readme file is located**

**2. execute following command in terminal**
```sh
openssl req -newkey rsa:2048 -new -nodes -x509 -days 365 -keyout key.pem -out cert.pem
```

**3. enter your data when prompted. use 'localhost' for Common Name in case of running https locally**
```sh
Country Name (2 letter code) [AU]:
State or Province Name (full name) [Some-State]:
Locality Name (eg, city) []:
Organization Name (eg, company) [Internet Widgits Pty Ltd]:
Organizational Unit Name (eg, section) []:
Common Name (e.g. server FQDN or YOUR name) []: localhost
Email Address []:
```