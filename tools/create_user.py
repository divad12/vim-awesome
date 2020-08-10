import argparse
import db.users
from werkzeug.security import generate_password_hash

if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument("--username", required=True, nargs="?", type=str)
    parser.add_argument("--password", required=True, nargs="?", type=str)
    parser.add_argument("--role", required=True, nargs="?", type=str,
                        choices=['admin', 'manager'])

    args = parser.parse_args()
    db.users.insert({
        'username': args.username,
        'password': generate_password_hash(args.password),
        'role': args.role
    })
    print('User added.')
