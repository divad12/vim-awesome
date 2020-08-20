import getpass
import argparse
import db.users
from werkzeug.security import generate_password_hash

if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument("--username", required=True, nargs="?", type=str)
    parser.add_argument("--role", required=True, type=str,
                        choices=['admin', 'manager'])

    args = parser.parse_args()
    password = getpass.getpass('Please enter password: ')
    if password.strip() == '':
        raise ValueError('Please enter valid password.')

    db.users.insert({
        'username': args.username,
        'password': generate_password_hash(password),
        'role': args.role
    })
    print('User added.')
