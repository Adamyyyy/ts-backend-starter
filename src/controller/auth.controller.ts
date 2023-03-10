import { Request, Response } from "express";
import { get } from "lodash";

import { verifyJwt } from "../utils/jwt";
import { CreateSessionInput } from "../schema/auth.schema";
import {
  findSessionById,
  signAccessToken,
  signRefreshToken,
} from "../service/auth.service";
import { findUserByEmail, findUserById } from "../service/user.service";

export async function createSessionHandler(
  req: Request<{}, {}, CreateSessionInput>,
  res: Response
) {
  const message = "Invalid email or password";

  const { email, password } = req.body;

  const user = await findUserByEmail(email);

  if (!user) {
    return res.send(message);
  }

  if (!user.verified) {
    return res.send("Please verify your email");
  }

  const isValid = await user.validatePasword(password);

  if (!isValid) {
    return res.send(message);
  }

  // sign a access token
  const accessToken = signAccessToken(user);

  // sign a refresh token
  const refreshToken = await signRefreshToken({ userId: user._id });
  // send the tokens

  return res.send({
    accessToken,
    refreshToken,
  });
}

export async function refreshAccessTokenHandler(req: Request, res: Response) {
  const refreshToken: any = get(req, "headers.x-refresh");

  const decoded = verifyJwt<{ sessionId: string }>(
    refreshToken,
    "refreshTokenPublicKey"
  );

  console.log(decoded);
  if (!decoded) {
    return res.status(401).send("Could not refresh access token");
  }

  const session = await findSessionById(decoded.sessionId);

  if (!session || !session.valid) {
    return res.status(401).send("Could not refresh access token");
  }

  const user = await findUserById(String(session.user));

  if (!user) {
    return res.status(401).send("Could not refresh access token");
  }

  const accessToken = signAccessToken(user);

  return res.send({ accessToken });
}
