from pydantic import BaseModel


class CheckoutSessionRequest(BaseModel):
    price_id: str = "price_starter"
    success_url: str
    cancel_url: str


class PortalSessionRequest(BaseModel):
    return_url: str


class StripeSessionResponse(BaseModel):
    url: str

